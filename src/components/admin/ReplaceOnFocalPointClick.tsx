'use client'

import { useModal, useUploadControls, useUploadEdits } from '@payloadcms/ui'
import { useEffect, useRef, type ChangeEvent } from 'react'

// Внутренние имена Payload 3.90 (elements/EditUpload, elements/Upload): «+» точки фокуса во встроенном
// «Редактировать изображение» и слаг его окна. Переименуют при обновлении — клик по «+» просто
// перестанет открывать выбор файла, остальное не сломается
const FOCAL_POINT = '.edit-upload__focalPoint'
const EDIT_DRAWER_SLUG = 'edit-upload'
// «+» таскают мышью, чтобы поставить фокус; выбор файла — только на клик без сдвига
const MAX_CLICK_SHIFT = 4

// Клик по «+» во встроенном редакторе — выбрать другую картинку вместо текущей.
// Рендерится внутри Upload (customActions), иначе setUploadControlFile не дойдёт до его формы
export function ReplaceOnFocalPointClick({ accept }: { accept?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { closeModal } = useModal()
  const { setUploadControlFile } = useUploadControls()
  const { resetUploadEdits } = useUploadEdits()

  useEffect(() => {
    let down: { x: number; y: number } | null = null
    const isFocalPoint = (e: MouseEvent) => e.target instanceof Element && e.target.closest(FOCAL_POINT) !== null

    const onMouseDown = (e: MouseEvent) => {
      down = isFocalPoint(e) ? { x: e.clientX, y: e.clientY } : null
    }
    const onClick = (e: MouseEvent) => {
      if (!down || !isFocalPoint(e)) return
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > MAX_CLICK_SHIFT) return
      inputRef.current?.click()
    }

    // окно редактора — портал вне нашего дерева, поэтому слушаем документ
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // сброс, чтобы повторный выбор того же файла снова вызвал change
    e.target.value = ''
    if (!file) return
    // кадрирование и точка фокуса из окна относились к старой картинке
    resetUploadEdits?.()
    setUploadControlFile(file)
    closeModal(EDIT_DRAWER_SLUG)
  }

  return <input ref={inputRef} type="file" accept={accept} hidden onChange={handleChange} />
}
