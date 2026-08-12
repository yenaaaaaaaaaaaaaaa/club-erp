import React, { useState, useEffect } from 'react'

export default function MemberModal({ isOpen, onClose, member, mode, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    phone: '',
    join_semester: '',
    department: '',
    college: '',
    join_type: '',
    grade: '',
    paid: false
  })
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(mode === 'create')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setShowConfirm(false)
      if (mode === 'create') {
        setFormData({
          name: '',
          student_id: '',
          phone: '',
          join_semester: '',
          department: '',
          college: '',
          join_type: '',
          grade: '',
          paid: false
        })
        setIsEditMode(true)
      } else if (member) {
        setFormData({
          name: member.name || '',
          student_id: member.student_id || '',
          phone: member.phone || '',
          join_semester: member.join_semester || '',
          department: member.department || '',
          college: member.college || '',
          join_type: member.join_type || '',
          grade: member.grade || '',
          paid: member.paid || false
        })
        setIsEditMode(mode === 'edit')
      }
    }
  }, [isOpen, member, mode])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onSave({ ...formData, grade: formData.grade === '' ? null : Number(formData.grade) })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (member?.roles?.is_president) {
      setError('회장은 삭제할 수 없습니다')
      setShowConfirm(false)
      return
    }
    try {
      await onDelete(member.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const inputClass = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh] border border-gray-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? '새 회원 등록' : isEditMode ? '회원 정보 수정' : '회원 상세'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {isEditMode ? (
            <form id="member-form" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">학번 *</label>
                  <input type="text" name="student_id" value={formData.student_id} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">전화번호</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">가입학기</label>
                  <input type="text" name="join_semester" placeholder="ex) 24-1" value={formData.join_semester} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">학년</label>
                  <input type="number" name="grade" value={formData.grade} onChange={handleChange} min="1" max="4" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">단과대</label>
                  <input type="text" name="college" value={formData.college} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">학과</label>
                  <input type="text" name="department" value={formData.department} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">가입경로</label>
                  <input type="text" name="join_type" value={formData.join_type} onChange={handleChange} className={inputClass} />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="paid"
                      checked={formData.paid}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">회비 입금 완료</span>
                  </label>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-6">{member?.name}</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                {[
                  { label: '학번', value: member?.student_id },
                  { label: '학년', value: member?.grade ? `${member.grade}학년` : '-' },
                  { label: '학과', value: member?.department || '-' },
                  { label: '단과대', value: member?.college || '-' },
                  { label: '전화번호', value: member?.phone || '-' },
                  { label: '가입 학기', value: member?.join_semester ? `${member.join_semester} 학기` : '-' },
                  { label: '가입 경로', value: member?.join_type || '-' },
                  { label: '입금', value: member?.paid ? 'O' : '미납' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-sm font-medium ${label === '입금' && !member?.paid ? 'text-red-500' : 'text-gray-800'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-2">
          {mode === 'view' && !isEditMode && (
            <>
              {showConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-500 font-medium">정말 삭제하시겠습니까?</span>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    삭제 확인
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    수정
                  </button>
                </>
              )}
            </>
          )}

          {isEditMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'create') onClose()
                  else setIsEditMode(false)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                form="member-form"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
