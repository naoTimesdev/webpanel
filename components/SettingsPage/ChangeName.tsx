import { toString } from "lodash";
import React from "react";

import { SettingsProps } from "./base";

import LoadingCircle from "../LoadingCircle";
import { MutateServerDocument } from "@/lib/graphql/servers.generated";
import client from "@/lib/graphql/client";

interface NamingState {
    newValue: string;
    isSubmitting: boolean;
}

class ChangeNameComponent extends React.Component<SettingsProps, NamingState> {
    constructor(props) {
        super(props);

        this.submitNewName = this.submitNewName.bind(this);

        this.state = {
            newValue: "",
            isSubmitting: false,
        };
    }

    async submitNewName() {
        const { newValue } = this.state;
        if (newValue.length < 1) {
            this.props.onErrorModal("Mohon masukan nama baru!");
            return;
        }
        this.setState({ isSubmitting: true });
        const { data, errors } = await client.mutate({
            mutation: MutateServerDocument,
            variables: {
                data: {
                    name: newValue,
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

        this.setState({ isSubmitting: false, newValue: data.updateServer.name });
    }

    render() {
        const { isSubmitting } = this.state;
        return (
            <>
                <div className="flex flex-col py-1">
                    <h3 className="font-semibold dark:text-white mb-2 text-lg">Ubah Nama</h3>
                    <div className="flex flex-row pb-2">
                        <div className="flex flex-col w-full md:w-1/2 lg:w-1/3">
                            <div className="w-full mt-2 mb-1 flex flex-col">
                                <label className="text-sm font-medium dark:text-white mb-1">Nama Baru</label>
                                <input
                                    type="text"
                                    value={this.state.newValue}
                                    className="form-darkable w-full py-1"
                                    placeholder="Nama Fansub"
                                    onChange={(ev) => this.setState({ newValue: toString(ev.target.value) })}
                                />
                            </div>
                            <div className="flex mt-2">
                                <button
                                    onClick={this.submitNewName}
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
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

export default ChangeNameComponent;
