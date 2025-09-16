import type { RequestHandler } from "express";
import { ApiResponse, CreateSiteRequest, CreateUserRequest, Site, User } from "@shared/api";
import { database } from "../database/connection.js";
import { getUserFromToken } from "./auth.js";
import { setUserPassword, userPasswords } from "./auth.js";

export const handleCreateUser: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const body: CreateUserRequest = req.body;
    const { role, name, fatherName, username, password, siteId } = body;

    if (!role || !name || !username || !password) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    if (role !== "foreman" && role !== "site_incharge") {
      const response: ApiResponse = { success: false, message: "Invalid role" };
      return res.status(400).json(response);
    }

    if (database.users.some(u => u.username === username)) {
      const response: ApiResponse = { success: false, message: "Username already exists" };
      return res.status(409).json(response);
    }

    const id = `user_${Date.now()}`;
    const newUser: User = {
      id,
      username,
      role,
      name,
      siteId,
      createdAt: new Date(),
      ...(fatherName ? { /* @ts-ignore */ fatherName } : {}),
    } as unknown as User;

    // Store user and password
    database.users.push(newUser);
    setUserPassword(username, password);

    const response: ApiResponse<{ user: User }> = { success: true, data: { user: newUser } };
    return res.status(201).json(response);
  } catch (error) {
    console.error("Create user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};

export const handleListUsers: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }
    const role = req.query.role as string | undefined;
    const users = role ? database.users.filter(u => u.role === role) : database.users;
    const response: ApiResponse<User[]> = { success: true, data: users };
    return res.json(response);
  } catch (error) {
    console.error("List users error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};

export const handleUpdateUser: RequestHandler = (req, res) => {
  try {
    const admin = getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }
    const { id } = req.params as { id: string };
    const user = database.users.find(u => u.id === id);
    if (!user) {
      const response: ApiResponse = { success: false, message: "User not found" };
      return res.status(404).json(response);
    }
    const { name, fatherName, username, password, siteId } = req.body as Partial<User> & { password?: string };

    if (username && username !== user.username && database.users.some(u => u.username === username)) {
      const response: ApiResponse = { success: false, message: "Username already exists" };
      return res.status(409).json(response);
    }

    const oldUsername = user.username;

    if (typeof name === 'string') user.name = name;
    if (typeof fatherName === 'string') (user as any).fatherName = fatherName;
    if (typeof username === 'string') user.username = username;
    if (typeof siteId === 'string') user.siteId = siteId;

    // Handle password and username changes coherently
    if (typeof password === 'string' && password) {
      // Set new password for (possibly new) username
      setUserPassword(user.username, password);
    } else if (user.username !== oldUsername) {
      // Migrate existing password mapping to new username when username changes without password change
      const existing = userPasswords.get(oldUsername) ?? "demo123";
      setUserPassword(user.username, existing);
    }
    // Clean up old key if username changed
    if (user.username !== oldUsername) {
      userPasswords.delete(oldUsername);
    }

    const response: ApiResponse<{ user: User }> = { success: true, data: { user } };
    return res.json(response);
  } catch (error) {
    console.error("Update user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};

export const handleDeleteUser: RequestHandler = (req, res) => {
  try {
    const admin = getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }
    const { id } = req.params as { id: string };
    const idx = database.users.findIndex(u => u.id === id);
    if (idx === -1) {
      const response: ApiResponse = { success: false, message: "User not found" };
      return res.status(404).json(response);
    }
    const removed = database.users.splice(idx, 1)[0];
    // If removed user is site incharge of a site, clear it
    database.sites.forEach(s => {
      if (s.inchargeId === removed.id) { s.inchargeId = ""; s.inchargeName = ""; }
    });
    const response: ApiResponse = { success: true };
    return res.json(response);
  } catch (error) {
    console.error("Delete user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};

export const handleCreateSite: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const body: CreateSiteRequest = req.body;
    const { name, location, inchargeId, foremanIds } = body;

    if (!name || !location) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    const id = `site_${Date.now()}`;
    const inchargeUser = inchargeId ? database.users.find(u => u.id === inchargeId) : undefined;
    if (inchargeId && !inchargeUser) {
      const response: ApiResponse = { success: false, message: "Invalid inchargeId" };
      return res.status(400).json(response);
    }

    const newSite: Site = {
      id,
      name,
      location,
      inchargeId: inchargeUser?.id || "",
      inchargeName: inchargeUser?.name || "",
      isActive: true,
    };
    database.sites.push(newSite);

    // Assign siteIds
    if (inchargeUser) inchargeUser.siteId = id;
    if (Array.isArray(foremanIds)) {
      database.users.filter(u => foremanIds.includes(u.id) && u.role === "foreman").forEach(f => {
        f.siteId = id;
      });
    }

    const response: ApiResponse<Site> = { success: true, data: newSite };
    return res.status(201).json(response);
  } catch (error) {
    console.error("Create site error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};

export const handleListSites: RequestHandler = (_req, res) => {
  try {
    const response: ApiResponse<Site[]> = { success: true, data: database.sites };
    return res.json(response);
  } catch (error) {
    console.error("List sites error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};
