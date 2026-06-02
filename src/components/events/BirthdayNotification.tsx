'use client';

import { useState, useEffect } from 'react';
import { eventService, Birthday } from '@/services/eventService';
import { Cake, Gift, Sparkles, PartyPopper, Star, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import confetti from 'canvas-confetti';

interface BirthdayNotificationProps {
  onClose?: () => void;
}

export default function BirthdayNotification({ onClose }: BirthdayNotificationProps) {
  const { user } = useAuthStore();
  const [myEvent, setMyEvent] = useState<any | null>(null);
  const [eventType, setEventType] = useState<'birthday' | 'anniversary' | null>(null);
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkMySpecialDay();
  }, []);

  const checkMySpecialDay = async () => {
    try {
      // Check if already shown today for this user
      const storageKey = `special_day_shown_${user?.id}_${new Date().toDateString()}`;
      if (localStorage.getItem(storageKey)) return;

      const res = await eventService.getTodaySpecial();
      if (!res.success || !res.data) return;

      const currentUserId = user?.id;
      const currentUserName = user?.name?.toLowerCase().trim();

      // Check birthdays — match only the logged-in user
      const myBirthday = res.data.birthdays?.find((b: Birthday) => {
        return (
          b.employee_id === currentUserId ||
          b.id === currentUserId ||
          b.name?.toLowerCase().trim() === currentUserName
        );
      });

      if (myBirthday) {
        setMyEvent(myBirthday);
        setEventType('birthday');
        setShow(true);
        localStorage.setItem(storageKey, 'true');
        triggerConfetti();
        return;
      }

      // Check anniversaries — match only the logged-in user
      const myAnniversary = res.data.anniversaries?.find((a: any) => {
        return (
          a.employee_id === currentUserId ||
          a.id === currentUserId ||
          a.name?.toLowerCase().trim() === currentUserName
        );
      });

      if (myAnniversary) {
        setMyEvent(myAnniversary);
        setEventType('anniversary');
        setShow(true);
        localStorage.setItem(storageKey, 'true');
        triggerConfetti();
      }
    } catch (error) {
      console.error('Failed to fetch special day:', error);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFC0CB'] });
    setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.3 }, colors: ['#FFD700', '#FFA500', '#FF8C00'] }), 200);
    setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.7 }, colors: ['#FF69B4', '#FF1493', '#FFB6C1'] }), 400);
  };

  const closeNotification = () => {
    setShow(false);
    onClose?.();
  };

  if (!mounted || !show || !myEvent) return null;

  const isBirthday = eventType === 'birthday';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeNotification} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
          <div className={`relative rounded-2xl shadow-2xl overflow-hidden ${
            isBirthday
              ? 'bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400'
              : 'bg-gradient-to-br from-violet-500 via-purple-400 to-indigo-400'
          }`}>

            {/* Decorative blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute top-20 right-10 text-4xl animate-bounce">{isBirthday ? '🎂' : '🎊'}</div>
              <div className="absolute bottom-20 left-10 text-3xl animate-pulse">{isBirthday ? '🎈' : '🥂'}</div>
              <div className="absolute top-10 left-10 text-2xl animate-spin-slow">✨</div>
              <div className="absolute bottom-10 right-10 text-2xl animate-bounce">{isBirthday ? '🎁' : '⭐'}</div>
            </div>

            <div className="relative p-6 text-center">
              <button onClick={closeNotification} className="absolute top-4 right-4 text-white/80 hover:text-white transition">
                <X size={20} />
              </button>

              {/* Icon */}
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                  <Cake size={48} className="text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Star size={16} className="text-yellow-300 fill-yellow-300" />
                  <h2 className="text-2xl font-bold text-white">
                    {isBirthday ? '🎉 Happy Birthday! 🎉' : '🎊 Work Anniversary! 🎊'}
                  </h2>
                  <Star size={16} className="text-yellow-300 fill-yellow-300" />
                </div>

                <p className="text-3xl font-extrabold text-white drop-shadow-lg">{myEvent.name}!</p>

                <div className="h-px bg-white/30 my-3" />

                <p className="text-white/90 text-lg leading-relaxed">
                  {isBirthday
                    ? 'Wishing you a wonderful year ahead filled with success, happiness, and good health!'
                    : `Congratulations on ${myEvent.age ? `${myEvent.age} year${myEvent.age > 1 ? 's' : ''}` : 'another year'} with the team! Thank you for your dedication.`}
                </p>

                <p className="text-white font-semibold text-md">
                  {isBirthday ? 'Have a fantastic birthday! 🌟' : "Here's to many more great years! 🌟"}
                </p>

                {myEvent.age !== undefined && isBirthday && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Heart size={14} className="text-pink-200 fill-pink-200" />
                    <span className="text-white/70 text-sm">Turning {myEvent.age} today!</span>
                    <Heart size={14} className="text-pink-200 fill-pink-200" />
                  </div>
                )}

                {myEvent.department && (
                  <p className="text-white/50 text-xs mt-1">{myEvent.department} Department</p>
                )}
              </div>

              <div className="mt-6">
                <Button onClick={closeNotification} className="w-full bg-white text-pink-600 hover:bg-pink-50 font-semibold">
                  <PartyPopper size={16} className="mr-2" />
                  {isBirthday ? 'Thank you! 🎂' : 'Celebrate! 🎊'}
                </Button>
              </div>
            </div>

            <div className="relative bg-black/20 px-6 py-3 text-center">
              <p className="text-white/60 text-xs flex items-center justify-center gap-2">
                <Sparkles size={12} />
                From the entire HR Team
                <Sparkles size={12} />
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }
      `}</style>
    </>
  );
}