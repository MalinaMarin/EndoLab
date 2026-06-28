"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Paperclip, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type CaseMessage = {
  id: string;
  created_at: string;
  sender_name: string;
  sender_role: string;
  body: string;
  message_type: "message" | "missing_record_request" | "specialist_question" | "status_update";
  attachments: Array<{ name: string; path: string; size: number; contentType: string }>;
};

export function CaseMessagingPanel({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState<CaseMessage["message_type"]>("message");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const loadMessages = useCallback(async function loadMessages() {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/messages`, { cache: "no-store" });
      const payload = await response.json() as { messages?: CaseMessage[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load messages.");
      setMessages(payload.messages ?? []);
    } catch (error) {
      toast.show({ title: "Messages unavailable", message: error instanceof Error ? error.message : "Could not load messages.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function sendMessage() {
    if (!body.trim() && attachments.length === 0) return;
    setSending(true);
    const formData = new FormData();
    formData.set("body", body);
    formData.set("messageType", messageType);
    attachments.slice(0, 3).forEach((file) => formData.append("attachments", file));
    try {
      const response = await fetch(`/api/cases/${caseId}/messages`, { method: "POST", body: formData });
      const payload = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Could not send message.");
      setBody("");
      setAttachments([]);
      await loadMessages();
    } catch (error) {
      toast.show({ title: "Message failed", message: error instanceof Error ? error.message : "Could not send message.", type: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
            <MessageSquareText className="h-4 w-4" />
            Case messages and record requests
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep patient, coordinator, and specialist follow-up questions attached to this case.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadMessages} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {loading ? <p className="p-3 text-sm text-slate-600">Loading messages...</p> : null}
        {!loading && messages.length === 0 ? <p className="p-3 text-sm text-slate-600">No messages yet.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-slate-950">{message.sender_name || "EndoLab user"}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-violet-50 px-2 py-1 font-semibold text-violet-800">{messageTypeLabel(message.message_type)}</span>
                <span className="text-slate-500">{new Date(message.created_at).toLocaleString()}</span>
              </div>
            </div>
            {message.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p> : null}
            {message.attachments?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <span key={attachment.path} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    {attachment.name}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
          <select value={messageType} onChange={(event) => setMessageType(event.target.value as CaseMessage["message_type"])} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="message">General message</option>
            <option value="missing_record_request">Missing-record request</option>
            <option value="specialist_question">Specialist question</option>
            <option value="status_update">Status update</option>
          </select>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Paperclip className="h-4 w-4" />
            {attachments.length ? `${attachments.length} attachment(s)` : "Attach files"}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dcm,application/pdf,image/jpeg,image/png,application/dicom" className="sr-only" onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 3))} />
          </label>
        </div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Write a focused case message, record request, or specialist question..." className="min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm" />
        <Button type="button" onClick={sendMessage} disabled={sending || (!body.trim() && attachments.length === 0)}>
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : "Send message"}
        </Button>
      </div>
    </section>
  );
}

function messageTypeLabel(type: CaseMessage["message_type"]) {
  if (type === "missing_record_request") return "Missing record";
  if (type === "specialist_question") return "Specialist question";
  if (type === "status_update") return "Status update";
  return "Message";
}
