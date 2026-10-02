"use client";

import { useEffect, useState } from "react";
import { X } from "react-feather";
import { Button } from "@/components/ui/Button";
import { dismissSeasonalNoticeForWeek, isSeasonalNoticeDismissed } from "@/services/notice-storage";

export function SeasonalNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const inWindow = today >= new Date(year, 4, 16) && today <= new Date(year, 5, 16, 23, 59, 59);
    const timer = window.setTimeout(() => setVisible(inWindow && !isSeasonalNoticeDismissed(today)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <aside className="seasonal-notice" role="status">
      <p>LittleApple 季节公告：查看工作室本月动态。</p>
      <div><a href="https://www.littleapple.top/ban-notice" target="_blank" rel="noopener noreferrer">了解详情</a><button type="button" onClick={() => { dismissSeasonalNoticeForWeek(); setVisible(false); }}>关闭一周</button><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setVisible(false)}><X size={16} /></Button></div>
    </aside>
  );
}
