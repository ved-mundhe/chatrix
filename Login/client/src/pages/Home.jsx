export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return (
    <div>
      <h1>Welcome, {user.username}</h1>
      {user.avatar && <img src={user.avatar} alt="avatar" style={{ width: 80 }} />}
    </div>
  );
}
