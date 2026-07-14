import Foundation

enum APIError: LocalizedError {
    case badStatus(Int)
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .badStatus(let code): return "Server returned status \(code)."
        case .invalidURL: return "Invalid URL."
        }
    }
}

/// Thin client for the NUFood backend. All reads/writes go through the same
/// REST API the web frontend uses; nothing here mutates backend behavior.
struct APIClient {
    static let baseURL = URL(string: "https://nufoodfinder-prod.up.railway.app")!

    var tokenProvider: () async throws -> String?

    init(tokenProvider: @escaping () async throws -> String? = { nil }) {
        self.tokenProvider = tokenProvider
    }

    // MARK: - Reads

    func fetchGeneralData() async throws -> GeneralDataResponse {
        try await get("/api/generalData", authenticated: false)
    }

    func fetchAllData() async throws -> AllDataResponse {
        try await get("/api/allData", authenticated: true)
    }

    // MARK: - Writes (all require auth)

    func saveFavorites(_ names: [String]) async throws {
        try await post("/api/userPreferences", body: names)
    }

    func saveMailing(_ mailing: Bool) async throws {
        try await post("/api/mailing", body: ["mailing": mailing])
    }

    func saveDisplayPreferences(visibleLocations: [String]) async throws {
        try await post("/api/displayPreferences", body: ["visibleLocations": visibleLocations])
    }

    func saveNutritionGoals(_ goals: NutritionGoals) async throws {
        try await post("/api/nutritionGoals", body: goals)
    }

    /// Permanently deletes all server-side data for the signed-in user.
    /// Treats any 2xx (including 200/204) as success.
    func deleteAccount() async throws {
        var request = URLRequest(url: Self.baseURL.appending(path: "/api/user"))
        request.httpMethod = "DELETE"
        if let token = try await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (_, response) = try await URLSession.shared.data(for: request)
        try Self.checkStatus(response)
    }

    // MARK: - Plumbing

    private func get<T: Decodable>(_ path: String, authenticated: Bool) async throws -> T {
        var request = URLRequest(url: Self.baseURL.appending(path: path))
        request.httpMethod = "GET"
        if authenticated, let token = try await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkStatus(response)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func post(_ path: String, body: some Encodable) async throws {
        var request = URLRequest(url: Self.baseURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = try await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(body)
        let (_, response) = try await URLSession.shared.data(for: request)
        try Self.checkStatus(response)
    }

    private static func checkStatus(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus(http.statusCode)
        }
    }
}
