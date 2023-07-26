import axios from "axios";
import { toString } from "lodash";
import React from "react";

import SelectAsync from "react-select/async";
import { ActionMeta } from "react-select";

import { SettingsProps } from "./base";

import LoadingCircle from "../LoadingCircle";
import client from "@/lib/graphql/client";
import { MutateServerDocument } from "@/lib/graphql/servers.generated";
import { DISCORD_CHANNEL, PREFIX_ANNOUNCEMENT } from "@/lib/graphql/integration-type";
import { IntegrationInputAction } from "@/lib/graphql/types.generated";

interface AnnouncerProps extends SettingsProps {
    announcerId?: string;
}

interface AnnouncerState {
    announcerId?: string;
    oldAnnouncer?: string;
    isSubmitting: boolean;
}

interface ChannelSelect {
    id: string;
    name: string;
}

function matchFilterProper(data: ChannelSelect, inputValue: string) {
    const matchRe = new RegExp(`(${inputValue})`, "i");
    const dataID = data.id;
    const dataName = data.name;
    return Boolean(dataID.match(matchRe)) || Boolean(dataName.match(matchRe));
}

const loadChannel = (inputValue: string, callback: Function) => {
    axios
        .get<{ results: ChannelSelect[] }>("/api/fsrss/channelfind", { responseType: "json" })
        .then((res) => {
            const results = res.data;
            const properResults = results.results.filter((e) => matchFilterProper(e, inputValue));
            callback(properResults);
        })
        .catch((err) => {
            console.error(err);
            callback([]);
        });
};

function optionValueChannel(data: any) {
    const { id, name } = data;
    return `#${name} (${id})`;
}

class AnnouncerSettings extends React.Component<AnnouncerProps, AnnouncerState> {
    constructor(props: AnnouncerProps) {
        super(props);
        this.submitNew = this.submitNew.bind(this);
        this.removeAnnouncer = this.removeAnnouncer.bind(this);
        this.onChannelSelection = this.onChannelSelection.bind(this);
        this.state = {
            announcerId: this.props.announcerId,
            oldAnnouncer: this.props.announcerId,
            isSubmitting: false,
        };
    }

    onChannelSelection(data: any, action: ActionMeta<any>) {
        if (!["select-option", "clear"].includes(action.action)) {
            return;
        }
        if (action.action === "select-option") {
            const { id } = data;
            this.setState({
                announcerId: id,
            });
        } else if (action.action === "clear") {
            this.setState({
                announcerId: "",
            });
        }
    }

    async submitNew() {
        if (this.state.isSubmitting) {
            return;
        }
        if (this.state.announcerId === this.state.oldAnnouncer) {
            return;
        }
        this.setState({ isSubmitting: true });
        const stringfied = toString(this.state.announcerId);

        const { data, errors } = await client.mutate({
            mutation: MutateServerDocument,
            variables: {
                data: {
                    integrations: [
                        {
                            id: stringfied,
                            type: `${PREFIX_ANNOUNCEMENT}${DISCORD_CHANNEL}`,
                            action: IntegrationInputAction.Upsert,
                        },
                    ],
                },
            },
        });

        if (errors) {
            this.setState({ isSubmitting: false });
            this.props.onErrorModal(errors.map((e) => e.message).join("\n"));
            return;
        }

        if (data.updateServer.__typename === "Result") {
            this.setState({ isSubmitting: false });
            this.props.onErrorModal(data.updateServer.message);
            return;
        }

        const announcerId = data.updateServer.integrations.filter(
            (e) => e.type === `${PREFIX_ANNOUNCEMENT}${DISCORD_CHANNEL}`
        );
        this.setState({
            isSubmitting: false,
            oldAnnouncer: announcerId[0]?.id,
            announcerId: announcerId[0]?.id,
        });
    }

    async removeAnnouncer() {
        if (this.state.isSubmitting) {
            return;
        }
        if (!this.state.oldAnnouncer) {
            return;
        }
        this.setState({ isSubmitting: true });

        const { data, errors } = await client.mutate({
            mutation: MutateServerDocument,
            variables: {
                data: {
                    integrations: [
                        {
                            id: this.state.oldAnnouncer,
                            type: `${PREFIX_ANNOUNCEMENT}${DISCORD_CHANNEL}`,
                            action: IntegrationInputAction.Delete,
                        },
                    ],
                },
            },
        });
        if (errors) {
            this.setState({ isSubmitting: false });
            this.props.onErrorModal(errors.map((e) => e.message).join("\n"));
            return;
        }

        if (data.updateServer.__typename === "Result") {
            this.setState({ isSubmitting: false });
            this.props.onErrorModal(data.updateServer.message);
            return;
        }

        this.setState({ isSubmitting: false, oldAnnouncer: null, announcerId: null });
    }

    render() {
        const { oldAnnouncer, isSubmitting } = this.state;

        let IDTextData = "Tidak ada kanal #announcer";
        if (typeof oldAnnouncer === "string" && oldAnnouncer.trim().length > 0) {
            IDTextData = `ID: ${oldAnnouncer}`;
        }

        return (
            <>
                <div className="flex flex-col py-1">
                    <h3 className="font-semibold dark:text-white mb-2 text-lg">Ubah Kanal #announcer</h3>
                    <div className="flex flex-col">
                        <span className="dark:text-white">{IDTextData}</span>
                    </div>
                    <div className="flex flex-row pb-2">
                        <div className="flex flex-col w-full md:w-1/2 lg:w-1/3">
                            <div className="w-full mt-2 mb-1">
                                <SelectAsync
                                    className="w-full mt-1 rounded-lg"
                                    cacheOptions
                                    loadOptions={loadChannel}
                                    defaultOptions
                                    defaultValue={this.props.announcerId}
                                    getOptionLabel={optionValueChannel}
                                    filterOption={() => true}
                                    onChange={this.onChannelSelection}
                                    placeholder="Ubah #kanal..."
                                    inputId="channel-announcer-selector-rselect"
                                    classNamePrefix="rselect"
                                    isClearable
                                />
                            </div>
                            <div className="flex flex-row gap-2 mt-2">
                                <button
                                    onClick={this.submitNew}
                                    className={`rounded text-white px-4 py-2 ${
                                        isSubmitting
                                            ? "bg-blue-500 cursor-not-allowed opacity-60"
                                            : "bg-blue-600 hover:bg-blue-700 opacity-100"
                                    } transition duration-200 flex flex-row items-center focus:outline-none`}
                                >
                                    {isSubmitting && <LoadingCircle className="ml-0 mt-0" />}
                                    <span className={isSubmitting ? "mt-0.5 font-semibold" : "font-semibold"}>
                                        Ubah
                                    </span>
                                </button>
                                <button
                                    onClick={this.removeAnnouncer}
                                    className={`rounded text-white px-4 py-2 ${
                                        isSubmitting
                                            ? "bg-red-500 cursor-not-allowed opacity-60"
                                            : "bg-red-600 hover:bg-red-700 opacity-100"
                                    } transition duration-200 flex flex-row items-center focus:outline-none`}
                                >
                                    {isSubmitting && <LoadingCircle className="ml-0 mt-0" />}
                                    <span className={isSubmitting ? "mt-0.5 font-semibold" : "font-semibold"}>
                                        Hapus
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

export default AnnouncerSettings;
