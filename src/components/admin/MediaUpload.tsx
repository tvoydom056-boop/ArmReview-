'use client'

import { Upload, useDocumentInfo, useForm } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

import { ReplaceOnFocalPointClick } from './ReplaceOnFocalPointClick'
import { SquareCropAction } from './SquareCropAction'

// Слот admin.components.edit.Upload коллекции media: стандартная загрузка Payload
// плюс кнопка «Квадрат и поворот» рядом со встроенной «Редактировать изображение»
// и замена файла кликом по «+» во встроенном редакторе
export function MediaUpload() {
  const { collectionSlug, data, docConfig, initialState } = useDocumentInfo()
  useClearFileAfterSave(data?.updatedAt)
  if (!collectionSlug || !docConfig || !('upload' in docConfig)) return null

  return (
    <Upload
      collectionSlug={collectionSlug}
      customActions={[
        <SquareCropAction key="square-crop" />,
        <ReplaceOnFocalPointClick key="replace-file" accept={docConfig.upload.mimeTypes?.join(', ')} />,
      ]}
      initialState={initialState}
      uploadConfig={docConfig.upload}
    />
  )
}

// Payload 3.90 после сохранения оставляет отправленный File в поле file (views/Edit onSave удаляет
// file только из ответа сервера, а при слиянии состояний старое значение остаётся) — и следующее
// «Сохранить», даже после правки одного alt, загружало ту же картинку заново под новым именем
function useClearFileAfterSave(savedAt: unknown) {
  const { dispatchFields } = useForm()
  const savedAtRef = useRef(savedAt)

  useEffect(() => {
    // при монтировании не трогаем: в поле может лежать файл, переданный в окно создания
    if (savedAtRef.current === savedAt) return
    savedAtRef.current = savedAt
    dispatchFields({ type: 'UPDATE', path: 'file', value: undefined })
  }, [savedAt, dispatchFields])
}
