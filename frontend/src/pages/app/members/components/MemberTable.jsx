import React from 'react'

export default function MemberTable({ members, onRowClick }) {
  if (!members || members.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        조회된 회원이 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3">이름</th>
            <th className="px-6 py-3">학번</th>
            <th className="px-6 py-3">전화번호</th>
            <th className="px-6 py-3">가입학기</th>
            <th className="px-6 py-3">학과</th>
            <th className="px-6 py-3">단과대</th>
            <th className="px-6 py-3">가입경로</th>
            <th className="px-6 py-3">학년</th>
            <th className="px-6 py-3">입금여부</th>
            <th className="px-6 py-3">역할</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              onClick={() => onRowClick(member)}
              className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 font-medium text-gray-900">{member.name}</td>
              <td className="px-6 py-4">{member.student_id}</td>
              <td className="px-6 py-4">{member.phone || '-'}</td>
              <td className="px-6 py-4">{member.join_semester || '-'}</td>
              <td className="px-6 py-4">{member.department || '-'}</td>
              <td className="px-6 py-4">{member.college || '-'}</td>
              <td className="px-6 py-4">{member.join_type || '-'}</td>
              <td className="px-6 py-4">{member.grade ? `${member.grade}학년` : '-'}</td>
              <td className="px-6 py-4">
                {member.paid ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    완료
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    미납
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                {member.roles?.name || <span className="text-gray-400">일반</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
