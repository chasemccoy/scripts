#!/usr/bin/swift

import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)

if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { granted, error in
        processCommand(granted: granted)
    }
} else {
    store.requestAccess(to: .event) { granted, error in
        processCommand(granted: granted)
    }
}

func processCommand(granted: Bool) {
    guard granted else {
        print("ERROR: Calendar access denied")
        exit(1)
    }

    let args = CommandLine.arguments
    guard args.count > 1 else {
        print("ERROR: No command specified")
        exit(1)
    }

    let command = args[1]

    switch command {
    case "list":
        listEvents(args: args)
    case "add":
        addEvent(args: args)
    case "delete":
        deleteEvent(args: args)
    case "list-calendars":
        listCalendars()
    default:
        print("ERROR: Unknown command '\(command)'")
        exit(1)
    }

    semaphore.signal()
}

func listEvents(args: [String]) {
    let daysAhead = args.count > 2 ? Int(args[2]) ?? 7 : 7

    let startDate = Calendar.current.startOfDay(for: Date())
    let endDate = Calendar.current.date(byAdding: .day, value: daysAhead, to: startDate)!

    let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: nil)
    let events = store.events(matching: predicate)

    for event in events.sorted(by: { $0.startDate < $1.startDate }) {
        let timeStr: String
        if event.isAllDay {
            timeStr = "All day"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            timeStr = formatter.string(from: event.startDate)
        }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateStr = dateFormatter.string(from: event.startDate)

        print("\(dateStr)|\(timeStr)|\(event.title ?? "")|\(event.calendar.title)")
    }
}

func addEvent(args: [String]) {
    // Parse arguments: title|date|time|duration|calendar|notes
    guard args.count > 2 else {
        print("ERROR: Missing event data")
        exit(1)
    }

    let parts = args[2].components(separatedBy: "|")
    guard parts.count >= 2 else {
        print("ERROR: Invalid event data format")
        exit(1)
    }

    let title = parts[0]
    let dateStr = parts[1]
    let timeStr = parts.count > 2 ? parts[2] : ""
    let durationStr = parts.count > 3 ? parts[3] : "60"
    let calendarName = parts.count > 4 ? parts[4] : ""
    let notes = parts.count > 5 ? parts[5] : ""

    // Parse date
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    guard let baseDate = dateFormatter.date(from: dateStr) else {
        print("ERROR: Invalid date format. Use yyyy-MM-dd")
        exit(1)
    }

    let event = EKEvent(eventStore: store)
    event.title = title

    // Set start date/time
    if timeStr.isEmpty {
        // All day event
        event.isAllDay = true
        event.startDate = baseDate
        event.endDate = baseDate
    } else {
        // Timed event
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"

        let timeComponents = timeStr.components(separatedBy: ":")
        guard timeComponents.count >= 1,
              let hour = Int(timeComponents[0]) else {
            print("ERROR: Invalid time format. Use 'h:mm a' (e.g., '2:30 PM')")
            exit(1)
        }

        var minute = 0
        var isPM = false

        if timeComponents.count > 1 {
            let minPart = timeComponents[1].uppercased()
            if let min = Int(minPart.replacingOccurrences(of: "AM", with: "").replacingOccurrences(of: "PM", with: "").trimmingCharacters(in: .whitespaces)) {
                minute = min
            }
            isPM = minPart.contains("PM")
        }

        var adjustedHour = hour
        if isPM && hour != 12 {
            adjustedHour += 12
        } else if !isPM && hour == 12 {
            adjustedHour = 0
        }

        var dateComponents = Calendar.current.dateComponents([.year, .month, .day], from: baseDate)
        dateComponents.hour = adjustedHour
        dateComponents.minute = minute

        guard let startDate = Calendar.current.date(from: dateComponents) else {
            print("ERROR: Could not create start date")
            exit(1)
        }

        event.isAllDay = false
        event.startDate = startDate

        let duration = Int(durationStr) ?? 60
        event.endDate = startDate.addingTimeInterval(TimeInterval(duration * 60))
    }

    // Set notes if provided
    if !notes.isEmpty {
        event.notes = notes
    }

    // Find calendar
    if !calendarName.isEmpty {
        if let calendar = store.calendars(for: .event).first(where: { $0.title == calendarName }) {
            event.calendar = calendar
        } else {
            print("ERROR: Calendar '\(calendarName)' not found")
            exit(1)
        }
    } else {
        // Use chase@chsmc.org as default, fall back to system default
        if let defaultCal = store.calendars(for: .event).first(where: { $0.title == "chase@chsmc.org" }) {
            event.calendar = defaultCal
        } else {
            event.calendar = store.defaultCalendarForNewEvents
        }
    }

    // Save event
    do {
        try store.save(event, span: .thisEvent)
        print("SUCCESS: Event created - \(title)")
    } catch {
        print("ERROR: Failed to save event - \(error.localizedDescription)")
        exit(1)
    }
}

func listCalendars() {
    let calendars = store.calendars(for: .event)
    for calendar in calendars {
        print("\(calendar.title)")
    }
}

func deleteEvent(args: [String]) {
    // Parse arguments: title|date
    guard args.count > 2 else {
        print("ERROR: Missing event data")
        exit(1)
    }

    let parts = args[2].components(separatedBy: "|")
    guard parts.count >= 2 else {
        print("ERROR: Invalid event data format. Use: title|date")
        exit(1)
    }

    let title = parts[0]
    let dateStr = parts[1]

    // Parse date
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    guard let searchDate = dateFormatter.date(from: dateStr) else {
        print("ERROR: Invalid date format. Use yyyy-MM-dd")
        exit(1)
    }

    // Search for event on that day
    let startOfDay = Calendar.current.startOfDay(for: searchDate)
    let endOfDay = Calendar.current.date(byAdding: .day, value: 1, to: startOfDay)!

    let predicate = store.predicateForEvents(withStart: startOfDay, end: endOfDay, calendars: nil)
    let events = store.events(matching: predicate)

    // Find matching event
    guard let eventToDelete = events.first(where: { $0.title == title }) else {
        print("ERROR: Event '\(title)' not found on \(dateStr)")
        exit(1)
    }

    // Check for attendees and warn
    if let attendees = eventToDelete.attendees, !attendees.isEmpty {
        let attendeeCount = attendees.count
        print("WARNING: Event has \(attendeeCount) attendee(s)")

        // List attendees
        for attendee in attendees {
            if let name = attendee.name {
                print("  - \(name)")
            } else {
                print("  - \(attendee.url.absoluteString)")
            }
        }
    }

    // Delete event
    do {
        try store.remove(eventToDelete, span: .thisEvent)
        print("SUCCESS: Event deleted - \(title)")
    } catch {
        print("ERROR: Failed to delete event - \(error.localizedDescription)")
        exit(1)
    }
}

semaphore.wait()
