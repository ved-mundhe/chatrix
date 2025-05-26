import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, Smile, Paperclip, X } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setText(text + emojiObject.emoji);
  };

  return (
    <div className="p-4 w-full bg-gradient-to-r from-base-100/95 to-base-100/90 backdrop-blur-lg border-t border-base-300/50">
      {/* Image Preview */}
      {imagePreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="mb-3 relative inline-block"
        >
          <img
            src={imagePreview}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-lg border-2 border-primary/20 shadow-lg"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </motion.button>
        </motion.div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-20 left-4 z-50"
        >
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </motion.div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          {/* File Upload */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            className="p-2.5 rounded-full hover:bg-base-200 transition-all duration-200 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-5 text-base-content/60 group-hover:text-primary transition-colors" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            className="p-2.5 rounded-full hover:bg-base-200 transition-all duration-200 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="size-5 text-base-content/60 group-hover:text-primary transition-colors" />
          </motion.button>

          {/* Emoji Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            className="p-2.5 rounded-full hover:bg-base-200 transition-all duration-200 group"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="size-5 text-base-content/60 group-hover:text-primary transition-colors" />
          </motion.button>
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-full bg-base-200/80 backdrop-blur-sm border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 placeholder:text-base-content/50"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="p-3 bg-gradient-to-r from-primary to-primary/80 text-primary-content rounded-full hover:from-primary/90 hover:to-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          <Send className="size-5" />
        </motion.button>
      </form>
    </div>
  );
};

export default MessageInput;