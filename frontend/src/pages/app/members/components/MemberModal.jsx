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
      await onSave(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(member.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const inputClass = `w-full px-3 py-2 bg-gray-800 border ${
    isEditMode ? 'border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent text-gray-400'
  } rounded outline-none transition-colors`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {mode === 'create' ? '새 회원 등록' : isEditMode ? '회원 정보 수정' : '회원 상세 정보'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl transition-colors">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 bg-red-900/50 border border-red-500/50 text-red-200 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form id="member-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-200">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">이름 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  required
                  className={inputClass}
                />
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">학번 *</label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  required
                  className={inputClass}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">전화번호</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  className={inputClass}
                />
              </div>

              {/* Join Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">가입학기</label>
                <input
                  type="text"
                  name="join_semester"
                  placeholder="ex) 24-1"
                  value={formData.join_semester}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  className={inputClass}
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">학년</label>
                <input
                  type="number"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  min="1"
                  max="4"
                  className={inputClass}
                />
              </div>

              {/* College */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">단과대</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  className={inputClass}
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">학과</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  className={inputClass}
                />
              </div>

              {/* Join Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">가입경로</label>
                <input
                  type="text"
                  name="join_type"
                  value={formData.join_type}
                  onChange={handleChange}
                  readOnly={!isEditMode}
                  className={inputClass}
                />
              </div>

              {/* Paid Status */}
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="paid"
                    checked={formData.paid}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50"
                  />
                  <span className="text-gray-300 font-medium">회비 입금 완료</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-800 bg-gray-900/50 rounded-b-xl gap-3">
          {mode === 'view' && !isEditMode && (
            <>
              {showConfirm ? (
                <div className="flex items-center gap-3 mr-auto">
                  <span className="text-sm text-red-400 font-medium">정말 삭제하시겠습니까?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    삭제 확인
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors mr-auto"
                >
                  삭제
                </button>
              )}
              
              {!showConfirm && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                >
                  수정하기
                </button>
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
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                form="member-form"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
