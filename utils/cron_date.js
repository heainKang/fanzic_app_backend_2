// 미반복 cron 형식 및 날짜
export function getNextWeekdayDate(hour, minute, baseDate = new Date()) {
    const now       = new Date(baseDate);
    const todayYear = now.getFullYear();
    const todayMon  = now.getMonth();      // 0–11
    const todayDate = now.getDate();       // 1–31
    const nowH      = now.getHours();
    const nowM      = now.getMinutes();
  
    // 오늘 지정 시각이 남아 있는지 확인
    let runDate;
    if (nowH < hour || (nowH === hour && nowM < minute)) {
      // 아직 오늘 실행 가능
      runDate = new Date(todayYear, todayMon, todayDate, hour, minute);
    } else {
      // 오늘은 지났으므로 내일 같은 시각
      const tomorrow = new Date(now);
      tomorrow.setDate(todayDate + 1);
      runDate = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        hour,
        minute
      );
    }
  
    const runDay   = runDate.getDate();       // 1–31
    const runMon   = runDate.getMonth() + 1;   // 1–12

    // 날짜를 "YYYY-MM-DD" 포맷으로 변환
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${runDate.getFullYear()}-${pad(runMon)}-${pad(runDay)}`;
    
    // cron: "분 시 일 월 *"

    const returnData = {cron: `0 ${minute} ${hour} ${runDay} ${runMon} *`, date: dateStr}
    return returnData;
  }


// 반복 cron 날짜 형식  
export function getWeeklyCron(days, hour, minute) {
    // 요일 숫자들을 쉼표로 연결
    const dow = days.join(',');
    // "분 시 일 월 요일" (일과 월은 * 로 두고 요일만 지정)
    return `0 ${minute} ${hour} * * ${dow}`;
  }