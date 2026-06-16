export default function TeamTab({ teamId, onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        height: "100%",
        background: "#ddd",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px"
      }}
    >
      {teamId || "Team"}
    </button>
  );
}
