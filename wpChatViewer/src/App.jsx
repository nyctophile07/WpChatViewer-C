import React, { useEffect, useMemo, useRef, useState } from "react";

function parseWhatsAppChat(text) {
  const lines = text.split(/\r?\n/);
  const parsed = [];

  const regex1 = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s-\s([^:]+):\s(.*)$/;
  const regex2 = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.*)$/;

  let currentMessage = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const match = line.match(regex1) || line.match(regex2);

    if (match) {
      if (currentMessage) {
        parsed.push(currentMessage);
      }

      currentMessage = {
        id: `${match[1]}-${match[2]}-${parsed.length}`,
        date: match[1],
        time: match[2],
        sender: match[3],
        message: match[4],
      };
    } else if (currentMessage && line.length > 0) {
      currentMessage.message += `\n${line}`;
    }
  }

  if (currentMessage) {
    parsed.push(currentMessage);
  }

  return parsed;
}

export default function WhatsAppChatViewer() {
  const messageRefs = useRef({});

  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [selectedSender, setSelectedSender] = useState("all");
  const [currentUser, setCurrentUser] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const handleFile = async (e) => {
    try {
      setError("");

      const file = e.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.name.endsWith(".txt")) {
        setError("Please upload a valid WhatsApp .txt export file.");
        return;
      }

      setSelectedFile(file.name);

      const text = await file.text();
      const parsedMessages = parseWhatsAppChat(text);

      if (!parsedMessages.length) {
        setError("No valid WhatsApp messages were found in this file.");
      }

      setMessages(parsedMessages);
      setActiveSearchIndex(0);
    } catch (err) {
      console.error(err);
      setError("Failed to read or parse the chat file.");
    }
  };

  const participants = useMemo(() => {
    return [...new Set(messages.map((m) => m.sender))];
  }, [messages]);

  useEffect(() => {
    if (participants.length && !currentUser) {
      setCurrentUser(participants[0]);
    }
  }, [participants, currentUser]);

  const senders = useMemo(() => {
    return participants;
  }, [participants]);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      return (
        selectedSender === "all" || msg.sender === selectedSender
      );
    });
  }, [messages, selectedSender]);

  const matchedIndexes = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) {
      return [];
    }

    return filteredMessages
      .map((msg, index) => {
        const matched =
          msg.message.toLowerCase().includes(q) ||
          msg.sender.toLowerCase().includes(q);

        return matched ? index : null;
      })
      .filter((v) => v !== null);
  }, [filteredMessages, search]);

  useEffect(() => {
    if (!matchedIndexes.length) {
      return;
    }

    const targetMessage = filteredMessages[matchedIndexes[activeSearchIndex]];

    if (
      targetMessage &&
      messageRefs.current[targetMessage.id]
    ) {
      messageRefs.current[targetMessage.id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSearchIndex, matchedIndexes, filteredMessages]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [search, selectedSender]);

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col">
      <header className="sticky top-0 z-50 bg-[#202c33]/95 backdrop-blur border-b border-[#2f3b43] p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            WhatsApp Chat Viewer
          </h1>

          <p className="text-sm text-gray-400 mt-1">
            Browser-based WhatsApp export viewer clone
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111b21] border border-[#2f3b43] px-4 py-2 rounded-xl outline-none w-full md:w-64"
          />

          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="bg-[#111b21] border border-[#2f3b43] px-4 py-2 rounded-xl outline-none text-white"
          >
            {participants.map((participant) => (
              <option key={participant} value={participant}>
                Me: {participant}
              </option>
            ))}
          </select>

          <select
            value={selectedSender}
            onChange={(e) => setSelectedSender(e.target.value)}
            className="bg-[#111b21] border border-[#2f3b43] px-4 py-2 rounded-xl outline-none text-white"
          >
            <option value="all">All Participants</option>

            {senders.map((sender) => (
              <option key={sender} value={sender}>
                {sender}
              </option>
            ))}
          </select>

          {!!matchedIndexes.length && (
            <div className="flex items-center gap-2 bg-[#111b21] border border-[#2f3b43] rounded-xl px-3 py-2 text-sm text-gray-300">
              <button
                onClick={() =>
                  setActiveSearchIndex((prev) =>
                    prev === 0 ? matchedIndexes.length - 1 : prev - 1
                  )
                }
                className="hover:text-white"
              >
                ↑
              </button>

              <span>
                {activeSearchIndex + 1}/{matchedIndexes.length}
              </span>

              <button
                onClick={() =>
                  setActiveSearchIndex((prev) =>
                    prev === matchedIndexes.length - 1 ? 0 : prev + 1
                  )
                }
                className="hover:text-white"
              >
                ↓
              </button>
            </div>
          )}

          <label className="cursor-pointer bg-[#25d366] text-black font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition text-center">
            Upload Chat

            <input
              type="file"
              accept=".txt"
              hidden
              onChange={handleFile}
            />
          </label>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0b141a]">
        {!messages.length && !error && (
          <div className="h-full min-h-[70vh] flex items-center justify-center text-center">
            <div>
              <div className="text-6xl mb-4">💬</div>

              <h2 className="text-2xl font-semibold mb-2">
                Upload a WhatsApp Export
              </h2>

              <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                Export your WhatsApp chat as a .txt file and upload it here to
                preview the conversation in a WhatsApp-style interface.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4">
            {error}
          </div>
        )}

        {selectedFile && (
          <div className="bg-[#202c33] rounded-2xl p-4 border border-[#2f3b43] shadow-lg">
            <p className="text-sm text-gray-300">
              Loaded file:{" "}
              <span className="font-semibold text-white">
                {selectedFile}
              </span>
            </p>

            <p className="text-sm text-gray-400 mt-1">
              Parsed messages: {filteredMessages.length}
            </p>
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          const previousMessage = filteredMessages[idx - 1];

          const showDateSeparator =
            !previousMessage || previousMessage.date !== msg.date;

          const isHighlighted =
            matchedIndexes[activeSearchIndex] === idx;

          const isUser = msg.sender === currentUser;

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-6">
                  <div className="bg-[#202c33] text-gray-300 text-xs px-4 py-2 rounded-full border border-[#2f3b43] shadow">
                    {msg.date}
                  </div>
                </div>
              )}

              <div
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
                className={`flex ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-lg whitespace-pre-wrap transition-all ${
                    isHighlighted
                      ? "ring-2 ring-yellow-400 scale-[1.01]"
                      : ""
                  } ${
                    isUser
                      ? "bg-[#005c4b]"
                      : "bg-[#202c33] border border-[#2f3b43]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-6 mb-2">
                    <span className="font-semibold text-sm text-[#86efac] truncate">
                      {msg.sender}
                    </span>

                    <span className="text-xs text-gray-300 shrink-0">
                      {msg.date} • {msg.time}
                    </span>
                  </div>

                  <p className="leading-relaxed text-[15px] break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {!!messages.length && !filteredMessages.length && (
          <div className="text-center text-gray-400 py-10">
            No messages matched the selected participant filter.
          </div>
        )}
      </main>
    </div>
  );
}
