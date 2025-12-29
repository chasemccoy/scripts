#!/usr/bin/env node

const { execFileSync } = require('child_process');
const path = require('path');

const swiftScript = path.join(__dirname, 'calendar.swift');

function getEventsForDateRange(daysAhead) {
  try {
    const result = execFileSync(swiftScript, ['list', String(daysAhead)], {
      encoding: 'utf8'
    }).trim();

    if (!result) return [];

    return result.split('\n').map(line => {
      const [date, time, summary, calendar] = line.split('|');
      const [year, month, day] = date.split('-');

      let startDate;
      if (time === 'All day') {
        startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        const timeMatch = time.match(/(\d+):(\d+) (AM|PM)/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const isPM = timeMatch[3] === 'PM';

          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;

          startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
        }
      }

      return {
        summary,
        startDate,
        calendar,
        allDay: time === 'All day'
      };
    }).filter(e => e.startDate);
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

function formatEvent(event) {
  const timeStr = event.allDay
    ? 'All day'
    : event.startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `  ${timeStr.padEnd(12)} ${event.summary}`;
}

function showToday() {
  const events = getEventsForDateRange(1);
  console.log(`Today (${events.length} events):\n`);
  events.forEach(event => console.log(formatEvent(event)));
}

function showTomorrow() {
  const events = getEventsForDateRange(2).filter(e => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return e.startDate >= tomorrow && e.startDate < dayAfter;
  });
  console.log(`Tomorrow (${events.length} events):\n`);
  events.forEach(event => console.log(formatEvent(event)));
}

function showWeek() {
  const events = getEventsForDateRange(7);
  console.log(`This week (${events.length} events):\n`);

  let currentDate = null;
  events.forEach(event => {
    const eventDate = event.startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (eventDate !== currentDate) {
      if (currentDate !== null) console.log('');
      console.log(eventDate + ':');
      currentDate = eventDate;
    }
    console.log(formatEvent(event));
  });
}

function showNextWeek() {
  const events = getEventsForDateRange(14).filter(e => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);
    return e.startDate >= sevenDays;
  });

  console.log(`Next week (${events.length} events):\n`);

  let currentDate = null;
  events.forEach(event => {
    const eventDate = event.startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (eventDate !== currentDate) {
      if (currentDate !== null) console.log('');
      console.log(eventDate + ':');
      currentDate = eventDate;
    }
    console.log(formatEvent(event));
  });
}

function listCalendars() {
  try {
    const result = execFileSync(swiftScript, ['list-calendars'], {
      encoding: 'utf8'
    }).trim();

    console.log('Available calendars:\n');
    result.split('\n').forEach(cal => console.log(`  ${cal}`));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

function addEvent(args) {
  // Parse arguments
  const title = args.shift();
  if (!title) {
    console.error('Error: Event title required');
    process.exit(1);
  }

  let date = '';
  let time = '';
  let duration = '60';
  let calendar = '';

  // Parse flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--date':
        date = args[++i] || '';
        break;
      case '--time':
        time = args[++i] || '';
        break;
      case '--duration':
        duration = args[++i] || '60';
        break;
      case '--calendar':
        calendar = args[++i] || '';
        break;
    }
  }

  if (!date) {
    console.error('Error: --date required (format: yyyy-MM-dd)');
    process.exit(1);
  }

  // Build pipe-delimited string: title|date|time|duration|calendar
  const eventData = `${title}|${date}|${time}|${duration}|${calendar}`;

  try {
    const result = execFileSync(swiftScript, ['add', eventData], {
      encoding: 'utf8'
    }).trim();

    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function deleteEvent(args) {
  // Parse arguments
  const title = args.shift();
  if (!title) {
    console.error('Error: Event title required');
    process.exit(1);
  }

  let date = '';

  // Parse flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--date') {
      date = args[++i] || '';
    }
  }

  if (!date) {
    console.error('Error: --date required (format: yyyy-MM-dd)');
    process.exit(1);
  }

  // Build pipe-delimited string: title|date
  const eventData = `${title}|${date}`;

  try {
    const result = execFileSync(swiftScript, ['delete', eventData], {
      encoding: 'utf8'
    }).trim();

    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'show-today':
    showToday();
    break;
  case 'show-tomorrow':
    showTomorrow();
    break;
  case 'show-week':
    showWeek();
    break;
  case 'show-next-week':
    showNextWeek();
    break;
  case 'list-calendars':
    listCalendars();
    break;
  case 'add':
    addEvent(args);
    break;
  case 'delete':
    deleteEvent(args);
    break;
  default:
    console.log('Usage: calendar-cli.js <command> [options]');
    console.log('\nCommands:');
    console.log('  show-today       Show events for today');
    console.log('  show-tomorrow    Show events for tomorrow');
    console.log('  show-week        Show events for the next 7 days');
    console.log('  show-next-week   Show events for days 7-14');
    console.log('  list-calendars   List all available calendars');
    console.log('  add              Add a new event');
    console.log('  delete           Delete an event');
    console.log('\nAdd event usage:');
    console.log('  calendar-cli.js add "Event Title" --date 2026-01-05 [--time "2:30 PM"] [--duration 60] [--calendar "Calendar Name"]');
    console.log('\nDelete event usage:');
    console.log('  calendar-cli.js delete "Event Title" --date 2026-01-05');
    console.log('  WARNING: Requires exact title match. Shows warning if event has attendees.');
    process.exit(1);
}
