import Foundation

public enum OriroRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum OriroReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct OriroRemindersListParams: Codable, Sendable, Equatable {
    public var status: OriroReminderStatusFilter?
    public var limit: Int?

    public init(status: OriroReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct OriroRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct OriroReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct OriroRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [OriroReminderPayload]

    public init(reminders: [OriroReminderPayload]) {
        self.reminders = reminders
    }
}

public struct OriroRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: OriroReminderPayload

    public init(reminder: OriroReminderPayload) {
        self.reminder = reminder
    }
}
