import Modal from './Modal';
import { useUI } from '../store/ui';

export default function ConfirmDialog() {
  const { confirm, closeConfirm } = useUI();
  if (!confirm) return null;

  return (
    <Modal
      open
      size="sm"
      title={confirm.title}
      onClose={() => closeConfirm(false)}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => closeConfirm(false)}>Keep it</button>
          <button className="btn-danger" onClick={() => closeConfirm(true)}>{confirm.confirmLabel || 'Delete'}</button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed muted">{confirm.body}</p>
    </Modal>
  );
}
