'use client'

import {
  Button,
  Drawer,
  EditDepthProvider,
  useDocumentInfo,
  useFormFields,
  useModal,
  useUploadControls,
  useUploadEdits,
} from '@payloadcms/ui'
import { useId, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'

import { cropSquare, getOutputFormat, normalizeRotation } from '@/lib/squareCrop'

import styles from './SquareCropAction.module.css'

const drawerSlug = 'square-crop'

type Source = { src: string; name: string; type: string }

// Кнопка у загрузки в коллекции media: обрезать квадратом (на сайте фото — круг) и повернуть.
// Картинка режется в браузере и уходит в форму как новый файл — Payload сам заменит старый
// и пересоберёт размер card при «Сохранить»
export function SquareCropAction() {
  const { openModal, closeModal } = useModal()
  const { data } = useDocumentInfo()
  const { setUploadControlFile } = useUploadControls()
  const { resetUploadEdits } = useUploadEdits()
  const value = useFormFields(([fields]) => fields.file?.value)
  const pendingFile = value instanceof File ? value : null
  const [source, setSource] = useState<Source | null>(null)

  const savedUrl = typeof data?.url === 'string' ? data.url : null
  if (!pendingFile && !savedUrl) return null

  function open() {
    // object URL прошлого открытия (окно могли закрыть крестиком, минуя apply)
    if (source?.src.startsWith('blob:')) URL.revokeObjectURL(source.src)
    // Выбранный, но ещё не сохранённый файл важнее уже загруженного
    setSource(
      pendingFile
        ? { src: URL.createObjectURL(pendingFile), name: pendingFile.name, type: pendingFile.type }
        : { src: savedUrl!, name: String(data?.filename ?? 'photo'), type: String(data?.mimeType ?? '') },
    )
    openModal(drawerSlug)
  }

  function apply(file: File) {
    // Встроенная обрезка Payload применилась бы на сервере поверх нашей — сбрасываем её
    resetUploadEdits?.()
    setUploadControlFile(file)
    closeModal(drawerSlug)
  }

  return (
    <>
      <Button buttonStyle="pill" margin={false} onClick={open} size="small">
        Квадрат и поворот
      </Button>
      {pendingFile && data?.filename ? (
        <span className={styles.note}>Новое фото заменит текущее после «Сохранить»</span>
      ) : null}
      <EditDepthProvider>
        <Drawer slug={drawerSlug} title="Квадрат и поворот">
          {source ? <SquareCropEditor source={source} onApply={apply} onCancel={() => closeModal(drawerSlug)} /> : null}
        </Drawer>
      </EditDepthProvider>
    </>
  )
}

// Монтируется заново при каждом открытии окна (Drawer рендерит детей только открытым) —
// масштаб и поворот сбрасываются сами
function SquareCropEditor({
  source,
  onApply,
  onCancel,
}: {
  source: Source
  onApply: (file: File) => void
  onCancel: () => void
}) {
  const id = useId()
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [area, setArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    if (!area) return
    setSaving(true)
    setError(null)
    try {
      const { type, name } = getOutputFormat(source.type, source.name)
      const blob = await cropSquare(source.src, area, rotation, type)
      onApply(new File([blob], name, { type }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обработать картинку')
      setSaving(false)
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.area}>
        <Cropper
          image={source.src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />
      </div>
      <p className={styles.hint}>
        Круг — как фото будет видно на сайте. Сохранится квадрат вокруг него: тяните кадр, крутите колесо для
        масштаба.
      </p>

      <div className={styles.controls}>
        <label className={styles.control} htmlFor={`${id}-zoom`}>
          <span>Масштаб</span>
          <input
            id={`${id}-zoom`}
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className={styles.value}>{zoom.toFixed(1)}×</span>
        </label>
        <label className={styles.control} htmlFor={`${id}-rotation`}>
          <span>Поворот</span>
          <input
            id={`${id}-rotation`}
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
          />
          <span className={styles.value}>{rotation}°</span>
        </label>
        <div className={styles.buttons}>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => setRotation((r) => normalizeRotation(r - 90))}
            size="small"
          >
            ↺ 90°
          </Button>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => setRotation((r) => normalizeRotation(r + 90))}
            size="small"
          >
            ↻ 90°
          </Button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <Button buttonStyle="primary" disabled={!area || saving} margin={false} onClick={handleApply}>
          {saving ? 'Обработка…' : 'Применить'}
        </Button>
        <Button buttonStyle="secondary" margin={false} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  )
}
