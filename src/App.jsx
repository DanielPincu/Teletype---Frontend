import { useStateless } from './hooks/useStateless'

export default function App() {
  const {
    localRef,
    remoteRef,
    status,
    startRandom,
    joinRoom,
    roomId,
    setRoomId,
    terminate
  } = useStateless()

  return (
    <div>
      <h2>Simple WebRTC</h2>

      <div>Status: {status}</div>

      <button onClick={startRandom}>
        Random Match
      </button>

      <div>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
        />
        <button onClick={joinRoom}>
          Join Room
        </button>
      </div>

      <button onClick={terminate}>
        Disconnect
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <video ref={localRef} autoPlay playsInline muted width="200" />
        <video ref={remoteRef} autoPlay playsInline width="200" />
      </div>
    </div>
  )
}