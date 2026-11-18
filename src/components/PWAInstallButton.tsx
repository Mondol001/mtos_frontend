import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../utils/pwa';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
        title="মোবাইল বা ডেস্কটপে অ্যাপ হিসেবে ইনস্টল করুন"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">অ্যাপ ইনস্টল</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
          title="iPhone / iPad এ ইনস্টল নির্দেশিকা"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">অ্যাপ ইনস্টল</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="ios-install-title"
                  className="text-base font-bold text-slate-900"
                >
                  iPhone / iPad-এ অ্যাপ ইনস্টল করুন
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="বন্ধ করুন"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-slate-600 list-decimal list-inside leading-relaxed">
                <li>
                  Safari ব্রাউজারের নিচের টুলবারে <strong>Share</strong> আইকনে ট্যাপ
                  করুন।
                </li>
                <li>
                  নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।
                </li>
                <li>
                  উপরে ডানদিকে <strong>Add</strong> বাটনে চাপ দিলে অ্যাপটি হোম স্ক্রিনে
                  যুক্ত হবে।
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
