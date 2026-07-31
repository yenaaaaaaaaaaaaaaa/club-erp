import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { noticeService } from '@/services/noticeService'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE = 50 * 1024 * 1024

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
}
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── 이미지 리사이즈 NodeView ──────────────────────────────────
function ResizableImageView({ node, updateAttributes }) {
  const { src, alt, width } = node.attrs
  const imgRef = useRef(null)

  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = imgRef.current ? imgRef.current.offsetWidth : (typeof width === 'number' ? width : 300)
    const onMove = (e) => {
      updateAttributes({ width: Math.max(60, startW + e.clientX - startX) })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <NodeViewWrapper as="div" style={{ position: 'relative', display: 'block', margin: '12px 0', userSelect: 'none' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          style={{ width: width ? `${width}px` : 'auto', maxWidth: '100%', display: 'block' }}
          draggable={false}
        />
        {/* 오른쪽 중간 핸들 */}
        <div
          onMouseDown={startResize}
          style={{
            position: 'absolute', top: '50%', right: 6,
            transform: 'translateY(-50%)',
            width: 10, height: 32,
            background: '#2563eb', borderRadius: 4,
            cursor: 'ew-resize', zIndex: 30,
            boxShadow: '0 0 0 2px white, 0 1px 4px rgba(0,0,0,0.4)',
            opacity: 0.85,
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') ? Number(el.getAttribute('width')) : null,
        renderHTML: attrs => attrs.width ? { width: attrs.width } : {},
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})

// ── 표 엣지 핸들 (floating overlay) ──────────────────────────
function TableEdgeHandles({ editor, containerRef }) {
  const [tables, setTables] = useState([])

  useEffect(() => {
    if (!editor) return
    const refresh = () => {
      if (!containerRef.current) return
      const tableEls = Array.from(editor.view.dom.querySelectorAll('table'))
      const containerRect = containerRef.current.getBoundingClientRect()
      const scrollTop = containerRef.current.scrollTop
      const scrollLeft = containerRef.current.scrollLeft

      const updated = tableEls.map((el, i) => {
        const r = el.getBoundingClientRect()
        return {
          key: i,
          el,
          top: r.top - containerRect.top + scrollTop,
          left: r.left - containerRect.left + scrollLeft,
          width: r.width,
          height: r.height,
        }
      })
      setTables(updated)
    }

    // editor 업데이트 시 + 약간 지연 (DOM 반영 후)
    const onUpdate = () => setTimeout(refresh, 30)
    editor.on('update', onUpdate)
    editor.on('selectionUpdate', onUpdate)
    refresh()
    return () => {
      editor.off('update', onUpdate)
      editor.off('selectionUpdate', onUpdate)
    }
  }, [editor, containerRef])

  const isLastColEmpty = (tableEl) => {
    return Array.from(tableEl.querySelectorAll('tr')).every(row => {
      const cells = row.querySelectorAll('td, th')
      const last = cells[cells.length - 1]
      return !last || last.textContent.trim() === ''
    })
  }

  const isLastRowEmpty = (tableEl) => {
    const rows = tableEl.querySelectorAll('tr')
    if (!rows.length) return false
    const lastRow = rows[rows.length - 1]
    return Array.from(lastRow.querySelectorAll('td, th')).every(c => c.textContent.trim() === '')
  }

  const focusCell = (cellEl) => {
    try {
      const pos = editor.view.posAtDOM(cellEl, 0)
      editor.chain().setTextSelection(pos).focus().run()
    } catch { editor.commands.focus() }
  }

  const getLastColCell = (tableEl) => {
    const firstRow = tableEl.querySelector('tr')
    const cells = firstRow?.querySelectorAll('td, th')
    return cells?.[cells.length - 1] ?? null
  }

  const getLastRowCell = (tableEl) => {
    const rows = tableEl.querySelectorAll('tr')
    return rows[rows.length - 1]?.querySelector('td, th') ?? null
  }

  // 우측 핸들: 클릭 → 열 추가, ← 드래그 → 빈 마지막 열 삭제
  const makeRightHandle = (tbl) => (e) => {
    e.preventDefault()
    const startX = e.clientX
    let dragged = false
    let deleted = false

    const onMove = (e) => {
      const delta = e.clientX - startX
      if (!dragged && Math.abs(delta) > 8) dragged = true
      // ← 드래그: 40px마다 마지막 빈 열 삭제
      if (dragged && delta < -40 && !deleted) {
        if (isLastColEmpty(tbl.el)) {
          const cell = getLastColCell(tbl.el)
          if (cell) { focusCell(cell); editor.chain().focus().deleteColumn().run() }
          deleted = true
        }
      }
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!dragged) {
        // 클릭: 열 추가
        const cell = getLastColCell(tbl.el)
        if (cell) { focusCell(cell); setTimeout(() => editor.chain().focus().addColumnAfter().run(), 0) }
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // 하단 핸들: ↓ 드래그 → 행 연속 추가, ↑ 드래그 → 빈 마지막 행 삭제
  const makeBottomDrag = (tbl) => (e) => {
    e.preventDefault()
    const STEP = 40 // px당 1행 추가
    let lastY = e.clientY
    let addedCount = 0

    const onMove = (e) => {
      const delta = e.clientY - lastY
      if (delta >= STEP) {
        const cell = getLastRowCell(tbl.el)
        if (cell) { focusCell(cell); editor.chain().focus().addRowAfter().run() }
        lastY += STEP
        addedCount++
      } else if (delta <= -STEP && addedCount === 0) {
        // 위쪽 드래그: 마지막 빈 행 삭제
        if (isLastRowEmpty(tbl.el)) {
          const rows = tbl.el.querySelectorAll('tr')
          const cell = rows[rows.length - 1]?.querySelector('td, th')
          if (cell) { focusCell(cell); editor.chain().focus().deleteRow().run() }
        }
        lastY -= STEP
      }
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const HANDLE_SIZE = 8

  return (
    <>
      {tables.map(tbl => (
        <div key={tbl.key}>
          {/* 우측 핸들 */}
          <div
            title="→ 드래그: 열 추가  ← 드래그: 빈 마지막 열 삭제"
            onMouseDown={makeRightHandle(tbl)}
            style={{
              position: 'absolute',
              top: tbl.top,
              left: tbl.left + tbl.width,
              width: HANDLE_SIZE + 4,
              height: tbl.height,
              cursor: 'col-resize',
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{
              width: HANDLE_SIZE, height: '40%', minHeight: 24,
              background: '#93c5fd', borderRadius: 4,
              pointerEvents: 'none',
            }} />
          </div>
          {/* 하단 핸들 */}
          <div
            title="↓ 드래그: 행 추가  ↑ 드래그: 빈 마지막 행 삭제"
            onMouseDown={makeBottomDrag(tbl)}
            style={{
              position: 'absolute',
              top: tbl.top + tbl.height,
              left: tbl.left,
              width: tbl.width,
              height: HANDLE_SIZE + 4,
              cursor: 'row-resize',
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{
              height: HANDLE_SIZE, width: '40%', minWidth: 24,
              background: '#93c5fd', borderRadius: 4,
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      ))}
    </>
  )
}

// ── 툴바 ─────────────────────────────────────────────────────
function TiptapToolbar({ editor, onImageFile }) {
  if (!editor) return null
  const inTable = editor.isActive('tableCell') || editor.isActive('tableHeader')
  const btn = (active) =>
    `px-2 py-1 rounded text-sm transition-colors cursor-pointer ${active ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100'}`

  return (
    <div className="flex flex-col gap-1 border-b border-gray-200 pb-2 mb-2">
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={onImageFile} className={btn(false)}>사진</button>
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn(inTable)}>표</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>—</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>❝</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}><u>U</u></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}><s>S</s></button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} disabled={!editor.can().undo()}>↺</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} disabled={!editor.can().redo()}>↻</button>
      </div>
      {inTable && (
        <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-400">표:</span>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run() }} className="px-2 py-1 rounded text-sm cursor-pointer hover:bg-red-100 text-red-500">전체 삭제</button>
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function NoticesPage() {
  const [notices, setNotices] = useState([])
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const editorContainerRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bold: false, italic: false, strike: false, blockquote: false, horizontalRule: false }),
      Bold, Italic, Underline, Strike, ResizableImage,
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
      Blockquote, HorizontalRule,
    ],
    content: '',
    // true로 초기화해야 addProseMirrorPlugins()에서 columnResizing 플러그인이 등록됨
    // (Table extension이 isEditable 체크를 플러그인 등록 시점에 수행)
    // 실제 editable 상태는 아래 useEffect에서 mode에 따라 제어
    editable: true,
  })

  useEffect(() => {
    if (editor) editor.setEditable(mode === 'edit')
  }, [editor, mode])

  const loadNotices = useCallback(async () => {
    const data = await noticeService.getAll()
    setNotices(data || [])
  }, [])

  useEffect(() => { loadNotices() }, [loadNotices])

  const selectNotice = async (notice) => {
    setError(''); setFiles([])
    const detail = await noticeService.getById(notice.id)
    setSelected(detail); setMode('view')
    editor?.commands.setContent(detail.content || '')
  }

  const startCreate = () => {
    setSelected(null); setTitle(''); setFiles([]); setError(''); setMode('edit')
    editor?.commands.setContent('')
  }

  const startEdit = () => {
    setTitle(selected.title); setFiles([]); setError(''); setMode('edit')
    editor?.commands.setContent(selected.content || '')
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해 주세요'); return }
    setError(''); setLoading(true)
    try {
      const content = editor?.getHTML() || ''
      if (selected) {
        await noticeService.update(selected.id, { title: title.trim(), content })
        if (files.length > 0) await noticeService.uploadFiles(selected.id, files)
        setSelected(await noticeService.getById(selected.id))
      } else {
        setSelected(await noticeService.create({ title: title.trim(), content, files }))
      }
      await loadNotices(); setMode('view'); setFiles([])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setLoading(true)
    try {
      await noticeService.remove(selected.id)
      setSelected(null); setMode(null); setDeleteConfirm(false)
      await loadNotices()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleDownload = async (file) => {
    try {
      const url = await noticeService.getSignedUrl(file.file_path)
      const a = document.createElement('a'); a.href = url; a.download = file.file_name; a.click()
    } catch (err) { setError(err.message) }
  }

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) { setError('png, jpg, gif, webp 이미지만 삽입 가능합니다'); return }
    try {
      const base64 = await fileToBase64(file)
      editor?.chain().focus().setImage({ src: base64 }).run()
    } catch { setError('이미지를 불러오는 데 실패했습니다') }
    e.target.value = ''
  }

  const addFiles = (incoming) => {
    setError('')
    const valid = []
    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) { setError('pdf, png, jpg, docx만 첨부 가능합니다'); continue }
      if (f.size > MAX_SIZE) { setError('파일 크기는 50MB 이하여야 합니다'); continue }
      valid.push(f)
    }
    setFiles(prev => [...prev, ...valid])
  }

  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      <style>{`
        .tiptap-editor blockquote {
          border-left: 3px solid #d1d5db; padding: 4px 12px;
          margin: 8px 0; color: #6b7280; font-style: italic;
        }
        .tiptap-editor hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .tiptap-editor table {
          border-collapse: collapse; width: 100%; margin: 12px 0;
          table-layout: fixed;
        }
        .tiptap-editor td, .tiptap-editor th {
          border: 1px solid #d1d5db; padding: 6px 10px; min-width: 40px;
          position: relative; word-break: break-word; white-space: normal;
          vertical-align: top; overflow: hidden;
        }
        .tiptap-editor th { background: #f9fafb; font-weight: 600; }
        .tiptap-editor .selectedCell { background: #eff6ff; }
        .tiptap-editor .column-resize-handle {
          background-color: #bfdbfe;
          bottom: 0; position: absolute; right: -2px; top: 0; width: 4px;
          z-index: 20; cursor: col-resize;
        }
        .tiptap-editor .column-resize-handle:hover,
        .tiptap-editor .column-resize-handle:active {
          background-color: #3b82f6;
        }
        .resize-cursor, .resize-cursor * { cursor: col-resize !important; }
        .tiptap-editor p { margin: 0; }
        .tiptap-editor .ProseMirror { outline: none; min-height: 100%; }
      `}</style>

      {/* 좌측 패널 */}
      <div className="w-60 shrink-0 flex flex-col border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-sm">공지 목록</span>
          <button onClick={startCreate} className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">+ 작성</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notices.map((n) => (
            <button key={n.id} onClick={() => selectNotice(n)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors cursor-pointer ${selected?.id === n.id ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}>
              <p className="text-sm truncate">{n.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.created_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 우측 패널 */}
      <div className="flex-1 border border-gray-200 rounded-xl overflow-y-auto flex flex-col">
        {!mode && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            공지를 선택하거나 새로 작성하세요
          </div>
        )}

        {mode === 'view' && selected && (
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-xs text-gray-400 mt-1">{formatDate(selected.created_at)}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <button onClick={startEdit} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors">수정</button>
                <button onClick={handleDelete} disabled={loading}
                  className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 active:bg-red-100 cursor-pointer transition-colors">
                  {deleteConfirm ? '확인' : '삭제'}
                </button>
                {deleteConfirm && (
                  <button onClick={() => setDeleteConfirm(false)}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors">취소</button>
                )}
              </div>
            </div>
            <div className="px-6 py-4 prose max-w-none flex-1 tiptap-editor" dangerouslySetInnerHTML={{ __html: selected.content || '' }} />
            {selected.events?.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                {selected.events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-2">
                    <span className="text-gray-400 text-lg">📅</span>
                    <div>
                      <p className="text-sm font-medium">{formatDate(ev.start_date)}</p>
                      <p className="text-xs text-gray-500">{ev.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected.notice_files?.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <p className="text-sm font-medium mb-2">첨부파일</p>
                <div className="flex flex-wrap gap-2">
                  {selected.notice_files.map(f => (
                    <button key={f.id} onClick={() => handleDownload(f)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">
                      <span className="text-gray-400">📎</span><span>{f.file_name}</span>
                      <span className="text-gray-400 text-xs">({formatFileSize(f.file_size)})</span>
                      <span className="text-gray-400 text-xs">↓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div className="flex flex-col h-full px-6 py-4 gap-4">
            <input type="text" placeholder="제목을 입력하세요" value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-semibold border-b border-gray-200 pb-2 outline-none w-full placeholder-gray-300" />

            <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleImageFile} />

            <div className="flex-1 flex flex-col border border-gray-200 rounded-xl p-3 min-h-0">
              <TiptapToolbar editor={editor} onImageFile={() => imageInputRef.current?.click()} />
              {/* 표 핸들 floating overlay를 위해 position: relative */}
              <div
                ref={editorContainerRef}
                className="flex-1 overflow-y-auto tiptap-editor cursor-text"
                style={{ position: 'relative' }}
                onClick={e => { if (e.target === e.currentTarget) editor?.commands.focus('end') }}
              >
                <EditorContent editor={editor} className="h-full prose max-w-none" />
                {/* 표 엣지 드래그 핸들 overlay */}
                {mode === 'edit' && (
                  <TableEdgeHandles editor={editor} containerRef={editorContainerRef} />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">파일 첨부</span>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">내 PC</button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden"
                  onChange={e => addFiles(Array.from(e.target.files))} />
              </div>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)} onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center text-sm text-gray-400 transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                {files.length > 0 ? (
                  <ul className="text-left space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>📎 {f.name} ({formatFileSize(f.size)})</span>
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 ml-2 cursor-pointer">✕</button>
                      </li>
                    ))}
                  </ul>
                ) : <span>📎 파일을 마우스로 끌어 오세요</span>}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={handleSave} disabled={loading}
                className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 active:bg-gray-900 disabled:opacity-50 cursor-pointer transition-colors">저장</button>
              {selected && (
                <button onClick={handleDelete} disabled={loading}
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 active:bg-red-100 disabled:opacity-50 cursor-pointer transition-colors">삭제</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
