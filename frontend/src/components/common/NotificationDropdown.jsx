import React, { useState, useEffect, useRef, useContext } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as notificationApi from '../../services/notification.api';
import { SocketContext } from '../../context/SocketContext';
import { formatDate } from '../../utils/helpers';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const socketContext = useContext(SocketContext);
  const { socket } = socketContext || {};

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewNotification = (newNotification) => {
      setNotifications(prev => {
        // Prevent duplicates in case socket emits twice
        if (prev.some(n => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);
    
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({ limit: 10, skip: 0 });
      const notifs = response.data.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead({ stopPropagation: () => {} }, notification._id);
    }
    
    setIsOpen(false);
    
    if (notification.relatedDocumentId) {
      navigate(`/documents/${notification.relatedDocumentId}`);
    } else if (notification.relatedCaseId) {
      navigate(`/cases/${notification.relatedCaseId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-primary border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-bg-secondary">
            <h3 className="font-medium text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-secondary">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-tertiary">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notif => (
                  <div 
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-bg-secondary cursor-pointer transition-colors relative group ${!notif.isRead ? 'bg-accent-subtle/30' : ''}`}
                  >
                    {!notif.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-sm ${!notif.isRead ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                        {notif.message}
                      </p>
                      {!notif.isRead && (
                        <button 
                          onClick={(e) => handleMarkAsRead(e, notif._id)}
                          className="text-text-tertiary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary mt-2">
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
