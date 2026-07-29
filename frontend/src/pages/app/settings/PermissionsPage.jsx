import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { roleService } from '@/services/roleService'
import { memberService } from '@/services/memberService'


const PERMS = [
  { key: 'perm_members', label: '회원 관리', desc: '회원 조회, 등록, 수정, 삭제', icon: <UsersIcon /> },
  { key: 'perm_activities', label: '활동 관리', desc: '활동 조회, 등록, 수정, 삭제', icon: <CheckIcon /> },
  { key: 'perm_notices', label: '공지 관리', desc: '공지 작성, 수정, 삭제', icon: <BellIcon /> },
  { key: 'perm_calendar', label: '캘린더', desc: '캘린더 일정 작성, 수정, 삭제', icon: <CalendarIcon /> },
  { key: 'perm_finance', label: '재정 관리', desc: '증빙 첨부, 정산, 수입 / 지출 관리', icon: <WalletIcon /> },
]

export default function PermissionsPage() {
  const navigate = useNavigate()
  const { clearAuth, member: currentMember } = useAuthStore()

  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [roleDetail, setRoleDetail] = useState(null)
  const [officers, setOfficers] = useState([])

  const [form, setForm] = useState({ name: '', description: '' })
  const [perms, setPerms] = useState({
    perm_members: false, perm_activities: false, perm_notices: false,
    perm_calendar: false, perm_finance: false,
  })

  const [inviteForm, setInviteForm] = useState({ name: '', student_id: '', email: '', role_id: '' })
  const [newPresident, setNewPresident] = useState('')

  const [deleteDialog, setDeleteDialog] = useState(null)
  const [transferDialog, setTransferDialog] = useState(false)
  const [error, setError] = useState('')
  const [inviteError, setInviteError] = useState('')

  const loadRoles = useCallback(async () => {
    const data = await roleService.getAll()
    setRoles(data)
  }, [])

  const loadOfficers = useCallback(async () => {
    const data = await memberService.getOfficers()
    setOfficers(data)
  }, [])

  useEffect(() => {
    loadRoles()
    loadOfficers()
  }, [loadRoles, loadOfficers])

  const loadRoleDetail = useCallback(async (id) => {
    const detail = await roleService.getById(id)
    setRoleDetail(detail)
    setForm({ name: detail.name, description: detail.description ?? '' })
    setPerms({
      perm_members: detail.perm_members,
      perm_activities: detail.perm_activities,
      perm_notices: detail.perm_notices,
      perm_calendar: detail.perm_calendar,
      perm_finance: detail.perm_finance,
    })
  }, [])

  const selectRole = useCallback(async (id) => {
    if (selectedRoleId === id) {
      setSelectedRoleId(null)
      setRoleDetail(null)
      setError('')
      return
    }
    setSelectedRoleId(id)
    setError('')
    await loadRoleDetail(id)
  }, [selectedRoleId, loadRoleDetail])

  const handleAddRole = async () => {
    try {
      const created = await roleService.create({
        name: '새 역할', description: null,
        perm_members: false, perm_activities: false,
        perm_notices: false, perm_calendar: false, perm_finance: false,
      })
      await loadRoles()
      selectRole(created.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('역할 이름을 입력해 주세요'); return }
    try {
      await roleService.update(selectedRoleId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        ...perms,
      })
      await loadRoles()
      await loadRoleDetail(selectedRoleId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteClick = () => setDeleteDialog({ count: roleDetail?.members?.length ?? 0 })

  const handleDeleteConfirm = async () => {
    try {
      await roleService.remove(selectedRoleId)
      setDeleteDialog(null)
      setSelectedRoleId(null)
      setRoleDetail(null)
      await loadRoles()
      await loadOfficers()
    } catch (err) {
      setDeleteDialog(null)
      setError(err.message)
    }
  }

  const handleRemoveRole = async (officerId) => {
    await memberService.removeRole(officerId)
    await loadRoleDetail(selectedRoleId)
    await loadOfficers()
  }

  const handleAssignRole = async (officerId, roleId) => {
    if (!roleId) return
    await memberService.assignRole(officerId, roleId)
    await loadRoleDetail(selectedRoleId)
    await loadOfficers()
  }

  const handleInvite = async () => {
    setInviteError('')
    const { name, student_id, email, role_id } = inviteForm
    if (!name.trim() || !student_id.trim() || !email.trim()) {
      setInviteError('이름, 학번, 이메일은 필수 입력 항목입니다')
      return
    }
    try {
      await roleService.inviteOfficer({ name: name.trim(), student_id: student_id.trim(), email: email.trim(), role_id: role_id || null })
      setInviteForm({ name: '', student_id: '', email: '', role_id: '' })
      await loadOfficers()
    } catch (err) {
      setInviteError(err.message)
    }
  }

  const handleRemoveOfficer = async (id) => {
    try {
      await memberService.remove(id)
      await loadOfficers()
    } catch (err) {
      setInviteError(err.message)
    }
  }

  const handleResend = async (email) => {
    try {
      await roleService.inviteOfficer({ name: '', student_id: `resend_${Date.now()}`, email, role_id: null })
    } catch (err) {
      if (err.message.includes('이미 초대') || err.message.includes('이미 가입')) return
    }
  }

  const handleTransferConfirm = async () => {
    if (!newPresident) return
    try {
      await roleService.transferPresident(newPresident)
      setTransferDialog(false)
      clearAuth()
      navigate('/app/dashboard')
    } catch (err) {
      setTransferDialog(false)
      setError(err.message)
    }
  }

  const currentPresidentMember = officers.find((o) => o.roles?.is_president)
  const transferCandidates = officers.filter((o) => o.id !== currentPresidentMember?.id)

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* 좌측 패널 */}
      <div className="w-[220px] flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">역할 관리</span>
          <button
            onClick={handleAddRole}
            className="text-xs px-2.5 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            + 추가
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {roles.map((r) => {
            const count = r.members?.[0]?.count ?? 0
            return (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition
                  ${selectedRoleId === r.id ? 'bg-gray-100' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-400 truncate">{r.description}</p>}
                </div>
                <span className="ml-2 flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {count}명
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-4">
        {/* 역할 상세 */}
        {roleDetail ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{roleDetail.name}</h2>
                {roleDetail.description && <p className="text-sm text-gray-400 mt-0.5">{roleDetail.description}</p>}
              </div>
              {!roleDetail.is_president && (
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <SaveIcon />저장
                  </button>
                  <button onClick={handleDeleteClick} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">
                    <TrashIcon />역할 삭제
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

            {roleDetail.is_president ? (
              /* 회장 역할: 양도만 표시 */
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">회장 양도</h3>
                <p className="text-sm text-gray-500 mb-3">
                  현재 회장: <span className="font-medium text-gray-800">{currentPresidentMember?.name ?? '-'}</span>
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs">
                      <th className="text-left px-4 py-2.5 font-medium">이름</th>
                      <th className="text-left px-4 py-2.5 font-medium">학번</th>
                      <th className="text-left px-4 py-2.5 font-medium">현재 역할</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {transferCandidates.filter((o) => o.user_id).map((o) => (
                      <tr key={o.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-sm">{o.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{o.student_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{o.roles?.name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setNewPresident(o.id); setTransferDialog(true) }}
                            className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                          >
                            양도
                          </button>
                        </td>
                      </tr>
                    ))}
                    {transferCandidates.filter((o) => o.user_id).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">양도받을 수 있는 임원이 없습니다</td></tr>
                    )}
                  </tbody>
                </table>
              </section>
            ) : (
              <>
                {/* 역할 기본 정보 */}
                <section className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">역할 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">역할 이름</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="역할 이름"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">역할 설명</label>
                      <input
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="역할 설명"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                </section>

                {/* 역할 권한 설정 */}
                <section className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">역할 권한 설정</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {PERMS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setPerms((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition
                          ${perms[p.key] ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="w-10 h-10 flex items-center justify-center text-gray-600">{p.icon}</div>
                        <span className="text-xs font-medium text-gray-800">{p.label}</span>
                        <p className="text-[10px] text-gray-400 text-center leading-relaxed">{p.desc}</p>
                        <div className="flex items-center gap-1 mt-auto">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center
                            ${perms[p.key] ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                            {perms[p.key] && (
                              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M2 5l2 2 4-4" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500">허용</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 이 역할을 가진 사람 */}
                <section className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">이 역할을 가진 사람</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="text-left px-4 py-2.5 font-medium">이름</th>
                        <th className="text-left px-4 py-2.5 font-medium">학번</th>
                        <th className="text-left px-4 py-2.5 font-medium">연락처</th>
                        <th className="text-left px-4 py-2.5 font-medium">학과</th>
                        <th className="text-left px-4 py-2.5 font-medium">부여일</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {roleDetail.members?.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 text-xs">이 역할을 가진 임원이 없습니다</td></tr>
                      )}
                      {roleDetail.members?.map((m) => (
                        <tr key={m.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">{m.name}</td>
                          <td className="px-4 py-3 text-gray-500">{m.student_id}</td>
                          <td className="px-4 py-3 text-gray-500">{m.phone ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{m.department ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {m.created_at ? new Date(m.created_at).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveRole(m.id)}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 transition"
                            >
                              <TrashIcon small />역할 삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* 역할 부여 */}
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">역할 부여</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="text-left px-4 py-2.5 font-medium">이름</th>
                        <th className="text-left px-4 py-2.5 font-medium">학번</th>
                        <th className="text-left px-4 py-2.5 font-medium">현재 역할</th>
                        <th className="px-4 py-2.5" colSpan={2} />
                      </tr>
                    </thead>
                    <tbody>
                      {officers.filter((o) => !o.roles?.is_president && o.user_id).map((o) => (
                        <tr key={o.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm">{o.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{o.student_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{o.roles?.name ?? '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleAssignRole(o.id, selectedRoleId)}
                              disabled={o.role_id === selectedRoleId}
                              className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {o.role_id === selectedRoleId ? '이미 부여됨' : '역할 부여'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">임원 목록</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium">이메일</th>
                  <th className="text-left px-4 py-2.5 font-medium">직책</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {officers.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">등록된 임원이 없습니다</td></tr>
                )}
                {officers.filter((o) => o.user_id).map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{o.name}</td>
                    <td className="px-4 py-3 text-gray-500">{o.email}</td>
                    <td className="px-4 py-3 text-gray-500">{o.roles?.name ?? '-'}</td>
                    <td className="px-4 py-3">
                      {o.id !== currentMember?.id && (
                        <button
                          onClick={() => handleRemoveOfficer(o.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 transition"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!selectedRoleId && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">임원 관리</h2>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <input value={inviteForm.student_id} onChange={(e) => setInviteForm((f) => ({ ...f, student_id: e.target.value }))} placeholder="학번" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <input value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="이메일" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <select value={inviteForm.role_id} onChange={(e) => setInviteForm((f) => ({ ...f, role_id: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 text-gray-600">
              <option value="">직책 선택</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {inviteError && <p className="text-xs text-red-500 mb-3">{inviteError}</p>}
          <button onClick={handleInvite} className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition mb-5">
            등록 및 초대 메일 발송
          </button>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-2.5 font-medium">이름</th>
                <th className="text-left px-4 py-2.5 font-medium">이메일</th>
                <th className="text-left px-4 py-2.5 font-medium">직책</th>
                <th className="text-left px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {officers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-xs">등록된 임원이 없습니다</td></tr>
              )}
              {officers.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{o.name}</td>
                  <td className="px-4 py-3 text-gray-500">{o.email}</td>
                  <td className="px-4 py-3 text-gray-500">{o.roles?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.user_id ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {o.user_id ? '가입완료' : '초대중'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!o.user_id && (
                      <div className="flex gap-2">
                        <button onClick={() => handleResend(o.email)} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1 transition">
                          재발송
                        </button>
                        <button onClick={() => handleRemoveOfficer(o.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 transition">
                          삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* 역할 삭제 확인 다이얼로그 */}
      {deleteDialog && (
        <Dialog
          message={`이 역할을 가진 ${deleteDialog.count}명의 역할이 함께 제거됩니다. 삭제하시겠습니까?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteDialog(null)}
          confirmLabel="삭제"
          danger
        />
      )}

      {/* 회장 양도 확인 다이얼로그 */}
      {transferDialog && (
        <Dialog
          message="정말 양도하시겠습니까? 이후 회장 권한을 사용할 수 없게 됩니다"
          onConfirm={handleTransferConfirm}
          onCancel={() => setTransferDialog(false)}
          confirmLabel="양도"
          danger
        />
      )}
    </div>
  )
}

function OfficerAssignRow({ officer, roles, onAssign }) {
  const [selectedRole, setSelectedRole] = useState('')
  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3 text-sm">{officer.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{officer.student_id}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{officer.roles?.name ?? '-'}</td>
      <td className="px-4 py-3">
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400 text-gray-600">
          <option value="">역할 선택</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onAssign(officer.id, selectedRole)} disabled={!selectedRole} className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
          역할 부여
        </button>
      </td>
    </tr>
  )
}

function Dialog({ message, onConfirm, onCancel, confirmLabel, danger }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 w-[360px]">
        <p className="text-sm text-gray-800 mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">취소</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg transition text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
}
function WalletIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-8 h-8"><path d="M20 12V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M20 12h-4a2 2 0 0 0 0 4h4V12z" /></svg>
}
function SaveIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
}
function TrashIcon({ small }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
}
