import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Phone, Search, Filter, UserPlus, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const filteredAndSearchedUsers = filteredUsers.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-80 bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 border-r border-indigo-100 dark:border-gray-700 flex flex-col transition-all duration-300 shadow-lg">
      {/* Header Section */}
      <div className="border-b border-indigo-100 dark:border-gray-700 w-full p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-800 dark:text-white hidden lg:block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Contacts
          </span>
        </motion.div>

        {/* Search Section */}
        <div className="space-y-4 hidden lg:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              className="input input-bordered input-sm w-full pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Section */}
          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-2 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-sm border-indigo-300 checked:bg-indigo-500 checked:border-indigo-500"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Online only
              </span>
            </label>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 font-medium">
                {onlineUsers.length - 1} online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        <AnimatePresence>
          {filteredAndSearchedUsers.map((user, index) => (
            <motion.button
              key={user._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-4 flex items-center gap-4 mb-2 rounded-xl transition-all duration-200
                hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-md hover:scale-[1.02]
                ${selectedUser?._id === user._id 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-[1.02]" 
                  : "bg-white/30 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300"
                }
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="w-12 h-12 object-cover rounded-full border-2 border-white shadow-md"
                />
                {onlineUsers.includes(user._id) && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className={`font-semibold truncate ${
                  selectedUser?._id === user._id ? "text-white" : "text-gray-800 dark:text-white"
                }`}>
                  {user.fullName}
                </div>
                <div className={`text-sm flex items-center gap-2 ${
                  selectedUser?._id === user._id ? "text-indigo-100" : "text-gray-500 dark:text-gray-400"
                }`}>
                  {onlineUsers.includes(user._id) ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Active now</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Last seen recently</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Action Icons */}
              <div className="hidden lg:flex items-center gap-1">
                {selectedUser?._id === user._id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex gap-1"
                  >
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-3 h-3" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredAndSearchedUsers.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {showOnlineOnly ? "No one's online" : "No contacts found"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showOnlineOnly 
                ? "Check back later when your friends come online" 
                : searchQuery 
                  ? "Try adjusting your search terms"
                  : "Start a conversation to see contacts here"
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Add Contact Button */}
      <div className="p-4 border-t border-indigo-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hidden lg:block">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Contact</span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;