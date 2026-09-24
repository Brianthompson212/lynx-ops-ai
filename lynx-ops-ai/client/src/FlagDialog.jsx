import { useEffect, useId, useRef } from 'react'

export default function FlagDialog({ title, onClose, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  return <dialog ref={dialog} className="ff-dialog" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose() }}>
    <header className="ff-dialog-heading"><h3 id={titleId}>{title}</h3><button type="button" aria-label="Close popup" onClick={onClose}>✕</button></header>
    {children}
  </dialog>
}
