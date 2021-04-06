import bodyparser from "body-parser";
import { ensureLoggedIn } from "connect-ensure-login";
import express from "express";
import { has } from "lodash";
import { Types } from "mongoose";

import { passport } from "../lib/passport";
import { emitSocket, emitSocketAndWait } from "../lib/socket";
import { isNone, Nullable } from "../lib/utils";
import { ShowAdminModel, ShowtimesModel, ShowtimesProps } from "../models/show";
import { UserModel, UserProps } from "../models/user";

const AuthAPIRoutes = express.Router();

AuthAPIRoutes.use(bodyparser.urlencoded({ extended: true }));

AuthAPIRoutes.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/",
        failureFlash: true,
        successRedirect: "/admin",
    }),
    (_, res) => {
        res.redirect("/admin");
    }
);

AuthAPIRoutes.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

function checkStringValid(data: any): boolean {
    if (typeof data !== "string") return false;
    if (data === "" || data === " ") return false;
    return true;
}

function toStr(data: any): string {
    if (typeof data === "number") {
        return data.toString();
    } else if (typeof data === "string") {
        return data;
    } else if (typeof data === "boolean") {
        return data ? "true" : "false";
    } else if (typeof data === "object") {
        return JSON.stringify(data);
    }
    return null;
}

async function tryServerAdminAdd(adminId: string, serverId: string) {
    const existingUsers = await ShowAdminModel.find({ id: { $eq: adminId } });
    let existingId: Nullable<Types.ObjectId>;
    if (existingUsers.length > 0) {
        existingId = existingUsers[0]._id;
    }
    if (isNone(existingId)) {
        const newSuperAdmin = {
            _id: new Types.ObjectId(),
            id: serverId,
            servers: [serverId],
        };
        await ShowAdminModel.insertMany([newSuperAdmin]);
    } else {
        await ShowAdminModel.findByIdAndUpdate(existingId, { $addToSet: { servers: serverId } });
    }
}

async function registerNewServer(server: any, admin: any) {
    const serverName = server.name;
    const serverId = server.id;

    const adminId = admin.id;

    const newShowtimesServer: ShowtimesProps = {
        id: toStr(serverId),
        name: serverName,
        serverowner: [toStr(adminId)],
        anime: [],
        announce_channel: null,
        konfirmasi: [],
    };
    // @ts-ignore
    await ShowtimesModel.insertMany([newShowtimesServer]);
    await tryServerAdminAdd(toStr(adminId), toStr(serverId));
    emitSocket("pull data", serverId);
}

AuthAPIRoutes.post("/register", async (req, res) => {
    const jsonBody = req.body;
    if (!checkStringValid(jsonBody.server)) {
        req.flash("error", "Mohon masukan server ID");
        res.redirect("/registrasi");
    } else if (!checkStringValid(jsonBody.admin)) {
        req.flash("error", "Mohon masukan admin ID");
        res.redirect("/registrasi");
    } else {
        const newServer = jsonBody.server;
        const newAdmin = jsonBody.admin;
        const checkIfServerExist = await ShowtimesModel.find({ id: { $eq: newServer } });
        if (checkIfServerExist.length > 0) {
            req.flash("error", "Server anda telah terdaftar!");
            res.redirect("/registrasi");
        } else {
            try {
                const verifyServer = await emitSocketAndWait("get server", newServer);
                try {
                    const verifyUser = await emitSocketAndWait("get user", newAdmin);
                    try {
                        const userPerms = await emitSocketAndWait("get user perms", {
                            id: newServer,
                            admin: newAdmin,
                        });
                        if (
                            userPerms.includes("owner") ||
                            userPerms.includes("manage_guild") ||
                            userPerms.includes("manage_server") ||
                            userPerms.includes("administrator")
                        ) {
                            await registerNewServer(verifyServer, verifyUser);
                            req.flash("info", "Sukses, silakan jalankan !tagih di server anda");
                            res.redirect("/");
                        } else {
                            req.flash(
                                "error",
                                "Maaf, anda tidak memiliki hak yang cukup untuk menjadi Admin (Manage Guild)"
                            );
                            res.redirect("/registrasi");
                        }
                    } catch (e) {
                        req.flash("error", "Terjadi kesalahan internal, mohon coba lagi");
                        res.redirect("/registrasi");
                    }
                } catch (e) {
                    req.flash("error", "Bot tidak dapat menemukan user tersebut!");
                    res.redirect("/registrasi");
                }
            } catch (e) {
                req.flash(
                    "error",
                    "Bot tidak dapat menemukan server tersebut! Pastikan Bot sudah di Invite!"
                );
                res.redirect("/registrasi");
            }
        }
    }
});

// AuthAPIRoutes.use(express.json());
AuthAPIRoutes.post("/reset", ensureLoggedIn("/"), async (req, res) => {
    const user = req.user as UserProps;
    const jsonBody = req.body;
    if (!checkStringValid(jsonBody.old) || !checkStringValid(jsonBody.new)) {
        req.flash("reseterror", "Tidak ada data yang mencukupi untuk password baru/lama");
        res.redirect("/admin/atur");
    } else {
        const oldUserData = await UserModel.findOne({ id: { $eq: user.id } });
        if (oldUserData.secret === jsonBody.old) {
            await UserModel.updateOne({ id: { $eq: user.id } }, { $set: { secret: jsonBody.new } });
            // @ts-ignore
            req.session.passport.user.secret = jsonBody.new;
            req.session.save((_e) => {
                req.session.reload((_e) => {
                    req.flash("resetinfo", "Sukses mengubah password");
                    res.redirect("/admin/atur");
                });
            });
        } else {
            req.flash("reseterror", "Password lama salah!");
            res.redirect("/admin/atur");
        }
    }
});

AuthAPIRoutes.post("/changename", ensureLoggedIn("/"), async (req, res) => {
    const user = req.user as UserProps;
    const jsonBody = req.body;
    if (!checkStringValid(jsonBody.newname)) {
        req.flash("nameerror", "Tidak ada data yang mencukupi untuk mengganti nama");
        res.redirect("/admin/atur");
    } else {
        await UserModel.updateOne({ id: { $eq: user.id } }, { $set: { name: jsonBody.newname } });
        // @ts-ignore
        req.session.passport.user.name = jsonBody.newname;
        req.session.save((_e) => {
            req.session.reload((_e) => {
                req.flash("nameinfo", "Sukses mengubah nama");
                res.redirect("/admin/atur");
            });
        });
    }
});

async function changeChannelId(serverId: string, channelId: string) {
    let channelInfo;
    try {
        channelInfo = await emitSocketAndWait("get channel", { id: channelId, server: serverId });
    } catch (e) {
        const errorData: string = e.toString().toLowerCase();
        let msgFucked = "Error tidak diketahui";
        if (errorData.includes("bukanlah angka")) {
            msgFucked = "ID bukanlah angka";
        } else if (errorData.includes("menemukan server")) {
            msgFucked = "Tidak dapat menemukan server";
        } else if (errorData.includes("menemukan channel")) {
            msgFucked = "Tidak dapat menemukan channel tersebut di server anda!";
        } else if (errorData.includes("bukan textchannel")) {
            msgFucked = "Channel bukanlah channel teks (Text Channel)";
        }
        return [false, "Gagal mendapatkan channel: " + msgFucked];
    }

    try {
        await ShowtimesModel.findOneAndUpdate(
            { id: { $eq: serverId } },
            { $set: { announce_channel: channelInfo.id } }
        );
    } catch (e) {
        return [false, "Tidak dapat memperbarui informasi server, mohon coba sesaat lagi"];
    }
    emitSocket("pull data", serverId);
    let channelName = channelInfo.name || channelId;
    if (channelName !== channelId) {
        channelName = "#" + channelName;
    }
    return [true, channelName];
}

AuthAPIRoutes.post("/announcechannel", ensureLoggedIn("/"), async (req, res) => {
    console.info(req.body);
    const reqData = req.body;
    if (isNone(req.user)) {
        res.status(404).json({ message: "Unauthorized", code: 403 });
    } else {
        if (!has(reqData, "channelid")) {
            req.flash("channelerror", "Mohon masukan channel ID");
            res.redirect("/admin/atur");
        } else {
            const userData = req.user as UserProps;
            if (userData.privilege === "owner") {
                res.redirect("/admin/atur");
            } else {
                const [result, msg] = await changeChannelId(userData.id, reqData.channelid);
                if (!result) {
                    req.flash("channelerror", msg);
                    res.redirect("/admin/atur");
                } else {
                    req.flash("channelinfo", `Sukses merubah channel ke ${msg}`);
                    res.redirect("/admin/atur");
                }
            }
        }
    }
});

export { AuthAPIRoutes };
