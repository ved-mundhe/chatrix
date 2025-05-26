const MessageSkeleton = () => {
  return (
    <div className="flex gap-3 items-start">
      <div className="skeleton w-10 h-10 rounded-full shrink-0"></div>
      <div className="flex flex-col gap-1 flex-1">
        <div className="skeleton h-4 w-20"></div>
        <div className="skeleton h-16 w-3/4"></div>
      </div>
    </div>
  );
};

export default MessageSkeleton;