import { useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { Mouja, MoujaMapItem, PricingSettings, SurveyType } from '../../types';
import { bnToEnDigits, enToBnDigits } from '../../utils/landRecords';

interface AdminMapsTabProps {
  moujas: Mouja[];
  maps: MoujaMapItem[];
  pricing: PricingSettings;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onSaveMap: (map: MoujaMapItem) => Promise<void>;
  onDeleteMap: (mapId: string) => Promise<void>;
}

export function AdminMapsTab({
  moujas,
  maps,
  pricing,
  busyId,
  setBusyId,
  setStatusMsg,
  onSaveMap,
  onDeleteMap,
}: AdminMapsTabProps) {
  const [mapMoujaId, setMapMoujaId] = useState(moujas[0]?.id || '');
  const [mapSurvey, setMapSurvey] = useState<SurveyType>('CS');
  const [mapSheet, setMapSheet] = useState('সিট নং ১');
  const [mapTitle, setMapTitle] = useState('');
  const [mapDesc, setMapDesc] = useState('');
  const [mapPrice, setMapPrice] = useState(String(pricing.defaultMapPrice));
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});

  function handleMapImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          setMapImageUrl(compressed);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleAddMap(e: React.FormEvent) {
    e.preventDefault();
    if (!mapTitle.trim() || !mapImageUrl.trim()) return;
    const mouja = moujas.find((m) => m.id === (mapMoujaId || moujas[0]?.id));
    setBusyId('addmap');
    setStatusMsg(null);
    try {
      const id = `map-${Date.now()}`;
      await onSaveMap({
        id,
        moujaId: mouja?.id || 'custom',
        moujaName: mouja?.name || 'মৌজা',
        jlNo: mouja?.jlNo || '—',
        surveyType: mapSurvey,
        sheetNo: mapSheet.trim() || 'সিট ১',
        title: mapTitle.trim(),
        description: mapDesc.trim() || 'মৌজা ম্যাপ কপি।',
        price: Number(bnToEnDigits(mapPrice)) || pricing.defaultMapPrice,
        imageUrl: mapImageUrl.trim(),
      });
      setMapTitle('');
      setMapDesc('');
      setMapImageUrl('');
      setStatusMsg('নতুন মৌজা ম্যাপ সফলভাবে প্রকাশ করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl px-4">
        {maps.map((m) => {
          const editedPrice = priceEdits[m.id] ?? String(m.price);
          return (
            <div
              key={m.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm font-bold text-slate-900">{m.title}</div>
                <div className="text-xs text-slate-500">
                  মৌজা: {m.moujaName} · {m.surveyType} · {m.sheetNo}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={editedPrice}
                  onChange={(e) =>
                    setPriceEdits((prev) => ({
                      ...prev,
                      [m.id]: e.target.value,
                    }))
                  }
                  className="w-24 h-9 px-2.5 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const nextPrice = Number(bnToEnDigits(editedPrice)) || m.price;
                    await onSaveMap({ ...m, price: nextPrice });
                    setStatusMsg(
                      `"${m.title}" এর মূল্য ৳${enToBnDigits(nextPrice)} করা হয়েছে।`
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  মূল্য সেভ
                </button>
                {!m.isBuiltIn && (
                  <button
                    type="button"
                    onClick={() => onDeleteMap(m.id)}
                    className="p-2 rounded-lg text-rose-700 hover:bg-rose-50 cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleAddMap}
        className="border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h3 className="font-bold text-slate-900 text-sm">
          নতুন মৌজা ম্যাপ যোগ করুন
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={mapMoujaId}
            onChange={(e) => setMapMoujaId(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {moujas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (জেএল {m.jlNo})
              </option>
            ))}
          </select>
          <input
            type="text"
            list="survey-suggestions"
            required
            placeholder="জরিপ (CS, SA, RS, BS...)"
            value={mapSurvey}
            onChange={(e) => setMapSurvey(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          />
          <input
            type="text"
            placeholder="মূল্য (৳)"
            value={mapPrice}
            onChange={(e) => setMapPrice(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="ম্যাপের শিরোনাম"
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="সিট নং (যেমন: সিট নং ২)"
            value={mapSheet}
            onChange={(e) => setMapSheet(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="সংক্ষিপ্ত বিবরণ"
          value={mapDesc}
          onChange={(e) => setMapDesc(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
        />
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="text"
            required
            placeholder="ছবির URL দিন অথবা পাশ থেকে ফাইল আপলোড করুন"
            value={mapImageUrl}
            onChange={(e) => setMapImageUrl(e.target.value)}
            className="flex-1 w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />
            ম্যাপ ছবি আপলোড
            <input
              type="file"
              accept="image/*"
              onChange={handleMapImageUpload}
              className="hidden"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busyId === 'addmap'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          মৌজা ম্যাপ প্রকাশ করুন
        </button>
      </form>
    </div>
  );
}
