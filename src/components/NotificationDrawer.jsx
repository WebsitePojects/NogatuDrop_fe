import React, { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiMapPin } from 'react-icons/fi';
import { useNotifications } from '@/context/NotificationContext';

const NotificationDrawer = ({ isOpen, open, onClose }) => {
  const { notifications, markAsRead, markAsUnread } = useNotifications();
  const [flashId, setFlashId] = useState(null);
  const visible = isOpen || open;

  if (!visible) return null;

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setFlashId(notif.id);
    setTimeout(() => setFlashId(null), 600);
  };

  const getStatusInfo = (notif) => {
    if (notif.type === 'no_stock') {
      return {
        icon: <FiAlertTriangle className="text-red-500" />,
        label: 'No stocks',
        labelClass: 'text-red-500',
        chipClass: 'bg-red-500/10 text-red-500 ring-red-500/15',
      };
    }

    if (notif.type === 'replenished' || notif.type === 'stock_replenished') {
      return {
        icon: <FiCheckCircle className="text-emerald-500" />,
        label: 'Replenished',
        labelClass: 'text-emerald-500',
        chipClass: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/15',
      };
    }

    return {
      icon: <FiAlertTriangle className="text-amber-500" />,
      label: 'Low Stock',
      labelClass: 'text-amber-500',
      chipClass: 'bg-amber-500/10 text-amber-500 ring-amber-500/15',
    };
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-[#120904]/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Close notifications"
      />

      <aside className="notification-panel fixed right-3 top-4 z-50 flex max-h-[min(82vh,720px)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(255,248,240,0.96)] text-[#2d1607] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.55)] dark:border-white/10 dark:bg-[rgba(20,20,20,0.92)] dark:text-[var(--dark-text)]">
        <div className="notification-panel-header flex items-start justify-between gap-4 border-b border-[#ead9c7] px-5 py-5 dark:border-[var(--dark-border)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a76726] dark:text-orange-300/80">
              Notice Board
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Notifications</h2>
            <p className="mt-1 text-sm text-[#7b5a43] dark:text-[var(--dark-muted)]">
              Recent updates, stock concerns, and operational alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#5d1a00] px-2.5 py-1 text-xs font-bold text-white shadow-[0_10px_22px_-16px_rgba(93,26,0,0.9)]">
              {notifications.length}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {notifications.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[#ead9c7] bg-white/50 px-5 py-10 text-center dark:border-[var(--dark-border)] dark:bg-white/5">
              <FiCheckCircle className="mx-auto h-10 w-10 text-emerald-500/70" />
              <p className="mt-4 text-sm font-semibold">All caught up.</p>
              <p className="mt-1 text-sm text-[#7b5a43] dark:text-[var(--dark-muted)]">
                No urgent updates need your attention right now.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, label, labelClass, chipClass } = getStatusInfo(notif);
              const location = notif.location || notif.title || 'Nogatu Update';
              const message = notif.message || notif.subtitle || notif.body || 'Review this notification for more details.';
              const isFlashing = flashId === notif.id;

              return (
                <article
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={[
                    'group relative w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-200',
                    notif.is_read
                      ? 'border-[#ead9c7] bg-white/75 dark:border-[var(--dark-border)] dark:bg-white/[0.03]'
                      : 'border-[#f2c38c] bg-[#fff7ef] shadow-[0_16px_35px_-28px_rgba(201,111,31,0.7)] dark:border-orange-500/30 dark:bg-orange-500/[0.08]',
                    isFlashing ? 'scale-[0.985]' : 'hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-26px_rgba(0,0,0,0.2)]',
                  ].join(' ')}
                >
                  {!notif.is_read && (
                    <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-3 pr-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7ecdf] text-base dark:bg-white/5">
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="h-3.5 w-3.5 shrink-0 text-[#7b5a43] dark:text-[var(--dark-muted)]" />
                          <p className="truncate text-sm font-bold">{location}</p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[#7b5a43] dark:text-[var(--dark-muted)]">
                          {message}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${chipClass}`}>
                      {label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
                      {notif.is_read ? 'Viewed' : 'Needs attention'}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (notif.is_read) {
                          markAsUnread(notif.id);
                        } else {
                          markAsRead(notif.id);
                        }
                      }}
                      className="rounded-full border border-[#ead9c7] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b5b35] transition hover:bg-[#fff5ea] dark:border-[var(--dark-border)] dark:text-[var(--dark-muted)] dark:hover:bg-white/5"
                    >
                      {notif.is_read ? 'Mark Unread' : 'Mark Read'}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="border-t border-[#ead9c7] bg-white/70 p-4 dark:border-[var(--dark-border)] dark:bg-white/[0.03]">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#5d1a00] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:brightness-110"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
};

export default NotificationDrawer;
