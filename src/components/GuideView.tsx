import {
  Bell,
  BookOpen,
  Clock,
  FileSearch,
  HelpCircle,
  Lock,
  Map as MapIcon,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { AppTab, PricingSettings } from '../types';
import { enToBnDigits } from '../utils/landRecords';

interface GuideViewProps {
  pricing: PricingSettings;
  onNavigateTab: (tab: AppTab) => void;
}

export function GuideView({ pricing, onNavigateTab }: GuideViewProps) {
  const steps = [
    {
      step: '১',
      title: 'একাউন্ট তৈরি ও লগইন',
      icon: ShieldCheck,
      desc: 'উপরে "লগইন / একাউন্ট" বাটনে ক্লিক করে Google একাউন্ট অথবা Email ও Password দিয়ে সহজেই লগইন বা নতুন একাউন্ট তৈরি করুন।',
    },
    {
      step: '২',
      title: 'বিকাশে ফান্ড যোগ করুন',
      icon: Wallet,
      desc: `প্রোফাইল ও ব্যালেন্স পাতায় থাকা অ্যাডমিন বিকাশ নম্বর (${pricing.bkashNumber}) কপি করে Send Money করুন এবং Transaction ID (TrxID) লিখে জমা দিন। অ্যাডমিন যাচাই করে ব্যালেন্স যুক্ত করে দেবেন।`,
    },
    {
      step: '৩',
      title: 'খতিয়ান ও দাগ অনুসন্ধান',
      icon: FileSearch,
      desc: `বিভাগ → জেলা → উপজেলা → মৌজা/জেএল নং ও জরিপের ধরন নির্বাচন করে বাংলা বা ইংরেজি সংখ্যায় সার্চ করুন। প্রথম মালিক ও প্রথম দাগ ফ্রি দেখা যাবে। সম্মতি দিয়ে ৳${enToBnDigits(pricing.khatianPrice)} মূল্যে পুরো তথ্য আনলক করুন।`,
    },
    {
      step: '৪',
      title: `${enToBnDigits(pricing.unlockDurationMinutes)} মিনিট মেয়াদ ও প্রিন্ট / PDF`,
      icon: Clock,
      desc: `পুরো তথ্য আনলক করার পর নির্ধারিত ${enToBnDigits(pricing.unlockDurationMinutes)} মিনিট পর্যন্ত লাইভ টাইমারসহ দেখতে ও প্রিন্ট/PDF সংরক্ষণ করতে পারবেন। মেয়াদ শেষে তথ্য স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে।`,
    },
    {
      step: '৫',
      title: 'মৌজা ম্যাপ ক্রয় ও ডাউনলোড',
      icon: MapIcon,
      desc: `মৌজা ম্যাপ পাতায় গিয়ে ৳${enToBnDigits(pricing.defaultMapPrice)} থেকে শুরু করে সম্মতি দিয়ে ম্যাপ কিনুন। কেনা ম্যাপ আজীবন হাই-রেজোলিউশনে দেখতে ও ডাউনলোড করতে পারবেন।`,
    },
    {
      step: '৬',
      title: 'অতিরিক্ত সেবা ও রিফান্ড সুবিধা',
      icon: RefreshCw,
      desc: 'সেবা সমূহ পাতায় অতিরিক্ত সেবার আবেদন করলে প্রথমে কোনো টাকা কাটা হবে না। অ্যাডমিন কাজটি Accept করলে কেবল টাকা কাটবে, এবং কাজটি সম্পন্ন করা না গেলে Cancel করার সাথে সাথেই সম্পূর্ণ টাকা রিফান্ড হবে।',
    },
  ];

  const faqs = [
    {
      q: 'টাকা কি অনুমতি ছাড়া কেটে নেওয়া হবে?',
      a: 'না। প্রতিটি পেইড আনলক, মৌজা ম্যাপ ক্রয় বা সেবার আবেদনের আগে একটি সম্মতি পপআপ (Confirmation) দেখাবে। আপনি "হ্যাঁ, রাজি আছি" ক্লিক করলেই কেবল লেনদেন সম্পন্ন হবে।',
    },
    {
      q: 'অ্যাডমিন রেট কমালে বা বাড়ালে কীভাবে জানব?',
      a: 'উপরের বেল (Notification) আইকনে ক্লিক করে সব সময় রেট পরিবর্তনের তালিকা দেখতে পারবেন। এছাড়া অ্যাডমিন রেট পরিবর্তন করলে সাথে সাথে লাইভ নোটিফিকেশন পপআপ চলে আসবে।',
    },
    {
      q: 'খতিয়ান আনলক করার পর আবার লক হয়ে গেলে কী করব?',
      a: 'নিরাপত্তার স্বার্থে নির্ধারিত সময় পর খতিয়ান লক হয়। তাই আনলক থাকা অবস্থাতেই "প্রিন্ট / PDF" বাটনে ক্লিক করে সংরক্ষণ করুন অথবা প্রয়োজনে পুনরায় আনলক করুন।',
    },
    {
      q: 'অতিরিক্ত সেবার কাজ সম্পন্ন না হলে টাকা ফেরত পাব?',
      a: 'হ্যাঁ, কাজ গৃহীত (Accept) হওয়ার পর কোনো কারণে কাজটি করা সম্ভব না হলে অ্যাডমিন কাজটি বাতিল (Cancel) করার সাথে সাথেই আপনার পুরো টাকা ওয়ালেট ব্যালেন্সে ফেরত চলে আসবে।',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              পোর্টাল ব্যবহারের নির্দেশিকা
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Mondol Telecom Online Services-এ খতিয়ান অনুসন্ধান, বিকাশ পেমেন্ট,
              মৌজা ম্যাপ ও অতিরিক্ত সেবার সম্পূর্ণ নিয়মাবলি।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('search')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
          >
            <FileSearch className="w-3.5 h-3.5" />
            খতিয়ান খুঁজুন
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            ফান্ড যোগ করুন
          </button>
        </div>
      </div>

      {/* 6-Step Visual Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((item) => {
          const IconComp = item.icon;
          return (
            <article
              key={item.step}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <IconComp className="w-4 h-4" />
                </div>
                <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                  ধাপ {item.step}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {item.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </article>
          );
        })}
      </div>

      {/* Lock & Notification Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              সতর্কতা: আনলক সময়সীমা রিমাইন্ডার
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              বর্তমানে প্রতি খতিয়ান আনলকের মেয়াদ{' '}
              <strong>
                {enToBnDigits(pricing.unlockDurationMinutes)} মিনিট
              </strong>
              । মেয়াদ শেষ হওয়ার আগে প্রিন্ট বা PDF সেভ করে রাখার অনুরোধ রইল।
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
          <Bell className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950">
              তাৎক্ষণিক রেট আপডেট ও যোগাযোগ
            </h3>
            <p className="text-xs text-emerald-900 leading-relaxed">
              যেকোনো সমস্যা, পেমেন্ট ভেরিফিকেশন বা বিশেষ তথ্যের জন্য সরাসরি{' '}
              <button
                type="button"
                onClick={() => onNavigateTab('contact')}
                className="underline font-bold cursor-pointer"
              >
                যোগাযোগ পাতায়
              </button>{' '}
              বার্তা পাঠান।
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            সাধারণ প্রশ্ন ও উত্তর (FAQ)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <h3 className="text-sm font-bold text-slate-900">{f.q}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
