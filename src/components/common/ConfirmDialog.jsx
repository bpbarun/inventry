import Modal from "./Modal";

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p style={{ marginBottom: 20, color: "var(--text-sub)", lineHeight: 1.6 }}>{message}</p>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}
