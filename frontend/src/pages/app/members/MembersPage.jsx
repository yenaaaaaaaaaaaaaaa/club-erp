/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { memberService } from '@/services/memberService'
import * as XLSX from 'xlsx'
import MemberTable from './components/MemberTable'
import MemberModal from './components/MemberModal'

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    search: '',
    join_semester: '',
    paid: ''
  })
  
  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'view' | 'edit'
    member: null
  })

  const fileInputRef = useRef(null)

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const activeFilters = { ...filters, search: debouncedSearch }
      const data = await memberService.getAll(activeFilters)
      setMembers(data)
    } catch (err) {
      console.error(err)
      alert('회원 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.join_semester, filters.paid, debouncedSearch])

  useEffect(() => {
    // eslint-disable-next-line
    loadMembers()
  }, [loadMembers])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet)

        // API expects mapped names, ensure excel columns match DB or map them here.
        // Assuming excel columns: name, student_id, email, phone, join_semester, etc.
        await memberService.upsertBulk(rows)
        alert('엑셀 업로드가 완료되었습니다.')
        loadMembers()
      } catch (err) {
        console.error(err)
        alert(`엑셀 업로드 실패: ${err.message}`)
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleExcelExport = () => {
    if (members.length === 0) {
      alert('추출할 데이터가 없습니다.')
      return
    }

    const exportData = members.map(m => ({
      '이름': m.name,
      '학번': m.student_id,
      '이메일': m.email,
      '전화번호': m.phone || '',
      '가입학기': m.join_semester || '',
      '학년': m.grade || '',
      '단과대': m.college || '',
      '학과': m.department || '',
      '가입경로': m.join_path || '',
      '입금여부': m.paid ? '완료' : '미납',
      '역할': m.roles?.name || '일반'
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members')
    
    // Auto-fit columns roughly
    const maxWidths = exportData.map(row => Object.keys(row).map(key => Math.max(key.length, String(row[key]).length)))
    // A bit more complex for precise autofit, but simple export is fine here.

    XLSX.writeFile(workbook, `동아리회원목록_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const openModal = (mode, member = null) => {
    setModalState({ isOpen: true, mode, member })
  }

  const handleSaveMember = async (formData) => {
    if (modalState.mode === 'create') {
      await memberService.create(formData)
    } else {
      await memberService.update(modalState.member.id, formData)
    }
    setModalState({ isOpen: false, mode: 'create', member: null })
    loadMembers()
  }

  const handleDeleteMember = async (id) => {
    await memberService.remove(id)
    setModalState({ isOpen: false, mode: 'create', member: null })
    loadMembers()
  }

  return (
    <div className="flex flex-col h-full gap-6 p-6 overflow-hidden max-w-7xl mx-auto">
      
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            name="search"
            placeholder="이름/학번 검색..."
            value={filters.search}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 text-sm"
          />
          <select
            name="join_semester"
            value={filters.join_semester}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">모든 학기</option>
            <option value="26-1">26-1</option>
            <option value="25-2">25-2</option>
            <option value="25-1">25-1</option>
            <option value="24-2">24-2</option>
            <option value="24-1">24-1</option>
          </select>
          <select
            name="paid"
            value={filters.paid}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">입금 전체</option>
            <option value="true">입금 완료</option>
            <option value="false">미납</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleExcelUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            엑셀 업로드
          </button>
          <button
            onClick={handleExcelExport}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
          >
            엑셀 추출
          </button>
          <button
            onClick={() => openModal('create')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 ml-2"
          >
            + 회원 등록
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center flex-1">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <MemberTable 
            members={members} 
            onRowClick={(member) => openModal('view', member)} 
          />
        )}
      </div>

      <MemberModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        member={modalState.member}
        onClose={() => setModalState({ isOpen: false, mode: 'create', member: null })}
        onSave={handleSaveMember}
        onDelete={handleDeleteMember}
      />
    </div>
  )
}
