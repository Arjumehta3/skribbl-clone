import { useGame } from "../context/GameContext";

interface Props {
  playerId: string;
  playerName: string;
}

// Host ko Kick + Ban, baaki players ko Vote kick (kam se kam 3 players hone chahiye)
export default function ModerationButtons({ playerId, playerName }: Props) {
  const { meId, players, kickPlayer, banPlayer, voteKick } = useGame();
  const me = players.find((p) => p.id === meId);
  if (!me || playerId === meId) return null;

  if (me.isHost) {
    return (
      <span className="mod-actions">
        <button
          className="mod-btn"
          title={`Kick ${playerName}`}
          onClick={() => kickPlayer(playerId)}
        >
          Kick
        </button>
        <button
          className="mod-btn danger"
          title={`Ban ${playerName}`}
          onClick={() => {
            if (window.confirm(`Ban ${playerName}? They won't be able to rejoin this room.`)) banPlayer(playerId);
          }}
        >
          Ban
        </button>
      </span>
    );
  }

  if (players.length < 3) return null;
  return (
    <span className="mod-actions">
      <button
        className="mod-btn"
        title={`Vote to kick ${playerName}`}
        onClick={() => voteKick(playerId)}
      >
        Vote kick
      </button>
    </span>
  );
}
