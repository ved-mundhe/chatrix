import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { Phone, Video, ArrowDownLeft, ArrowUpRight, XCircle } from "lucide-react";

const statusColors = {
  completed: "text-green-600",
  missed: "text-red-600",
  rejected: "text-yellow-600",
};

function formatDuration(seconds) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

const CallHistoryPage = () => {
  const { authUser } = useAuthStore();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    setLoading(true);
    axiosInstance
      .get(`/calls/${authUser._id}`)
      .then((res) => setCalls(res.data))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [authUser]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-6">Call History</h2>
      {loading ? (
        <div>Loading...</div>
      ) : calls.length === 0 ? (
        <div className="text-center text-base-content/70">No calls yet.</div>
      ) : (
        <ul className="divide-y divide-base-200">
          {calls.map((call) => {
            const isOutgoing = call.callerId._id === authUser._id;
            const otherUser = isOutgoing ? call.receiverId : call.callerId;
            return (
              <li key={call._id} className="flex items-center gap-4 py-4">
                <img
                  src={otherUser.profilePic || "/avatar.png"}
                  alt={otherUser.fullName}
                  className="w-12 h-12 rounded-full border"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{otherUser.fullName}</span>
                    {call.status === "missed" && (
                      <span className="text-xs text-red-600 font-semibold ml-2">Missed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/70 mt-1">
                    {isOutgoing ? (
                      <ArrowUpRight className="w-4 h-4 text-primary" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-secondary" />
                    )}
                    <span>{call.callType === "video" ? <Video className="inline w-4 h-4" /> : <Phone className="inline w-4 h-4" />}</span>
                    <span>{formatTime(call.startedAt)}</span>
                    <span className="ml-2">Duration: {formatDuration(call.duration)}</span>
                  </div>
                </div>
                {call.status === "rejected" && <XCircle className="w-5 h-5 text-yellow-600" title="Rejected" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CallHistoryPage; 