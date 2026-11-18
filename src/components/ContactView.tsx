import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import type { PricingSettings } from '../types';

interface ContactViewProps {
  pricing: PricingSettings;
  defaultName?: string;
  defaultEmail?: string;
  onSendMessage: (payload: {
    name: string;
    phone: string;
    email: string;
    subject: string;
    message: string;
  }) => Promise<void>;
}

export function ContactView({
  pricing,
  defaultName = '',
  defaultEmail = '',
  onSendMessage,
}: ContactViewProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('পেমেন্ট / ব্যালেন্স সংক্রান্ত');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function copyText(text: string, field: 'phone' | 'email') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!name.trim() || phone.trim().length < 6 || message.trim().length < 3) {
      setFeedback({
        type: 'error',
        text: 'আপনার নাম, সঠিক মোবাইল নম্বর এবং বিস্তারিত বার্তা লিখুন।',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSendMessage({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setMessage('');
      setFeedback({
        type: 'success',
        text: 'আপনার বার্তা সফলভাবে পাঠানো হয়েছে। সুপার অ্যাডমিন শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'বার্তা পাঠানো যায়নি। অনুগ্রহ করে সরাসরি হেল্পলাইনে কল করুন।',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              যোগাযোগ ও সাপোর্ট কেন্দ্র
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              যেকোনো খতিয়ান, মৌজা ম্যাপ, বিকাশ পেমেন্ট ভেরিফিকেশন অথবা
              অতিরিক্ত সেবার জন্য সরাসরি যোগাযোগ করুন।
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Direct Contact Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              সরাসরি যোগাযোগের মাধ্যম
            </h2>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                হেল্পলাইন / বিকাশ নম্বর
              </div>
              <div className="flex items-center justify-between gap-2">
                <a
                  href={`tel:${pricing.bkashNumber}`}
                  className="text-lg font-bold text-slate-900 font-mono tabular-nums hover:text-emerald-700"
                >
                  {pricing.bkashNumber}
                </a>
                <button
                  type="button"
                  onClick={() => copyText(pricing.bkashNumber, 'phone')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedField === 'phone' ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                কল, বিকাশ ({pricing.bkashAccountType}) এবং জরুরি সহায়তা
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
                অ্যাডমিন সাপোর্ট ইমেইল
              </div>
              <div className="flex items-center justify-between gap-2">
                <a
                  href="mailto:mohammadiaqub@gmail.com"
                  className="text-sm font-bold text-slate-900 break-all hover:text-emerald-700"
                >
                  mohammadiaqub@gmail.com
                </a>
                <button
                  type="button"
                  onClick={() => copyText('mohammadiaqub@gmail.com', 'email')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  {copiedField === 'email' ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  সাপোর্ট ও ভেরিফিকেশন সময়
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  প্রতিদিন সকাল ৯:০০ টা — রাত ১০:০০ টা। অনলাইন খতিয়ান ও ম্যাপ
                  পোর্টাল ২৪ ঘণ্টা চালু থাকে।
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  মন্ডল টেলিকম অনলাইন সার্ভিসেস
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  স্থল নওহাটা, চৌহালী, সিরাজগঞ্জ (সারা বাংলাদেশের ডিজিটাল ভূমি
                  সেবা)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Inquiry Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">
            সরাসরি বার্তা পাঠান
          </h2>

          {feedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                আপনার নাম
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার পূর্ণ নাম"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="contact-phone"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                মোবাইল নম্বর
              </label>
              <input
                id="contact-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-email"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                ইমেইল (ঐচ্ছিক)
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                বিষয়
              </label>
              <select
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
              >
                <option value="পেমেন্ট / ব্যালেন্স সংক্রান্ত">
                  পেমেন্ট / ব্যালেন্স সংক্রান্ত
                </option>
                <option value="খতিয়ান বা মৌজা ম্যাপ অনুসন্ধান">
                  খতিয়ান বা মৌজা ম্যাপ অনুসন্ধান
                </option>
                <option value="অতিরিক্ত সেবার আবেদন ও রিফান্ড">
                  অতিরিক্ত সেবার আবেদন ও রিফান্ড
                </option>
                <option value="নতুন মৌজা বা তথ্য যোগ করার অনুরোধ">
                  নতুন মৌজা বা তথ্য যোগ করার অনুরোধ
                </option>
                <option value="অন্যান্য">অন্যান্য</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
            >
              বিস্তারিত বার্তা
            </label>
            <textarea
              id="contact-message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="আপনার সমস্যা, TrxID, মৌজার নাম বা প্রয়োজনীয় তথ্য বিস্তারিত লিখুন..."
              className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}
          </button>
        </form>
      </div>
    </section>
  );
}
