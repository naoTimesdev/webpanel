import * as Types from "./types.generated";

import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type ResultFragFragment = {
    __typename?: "Result";
    success: boolean;
    code?: string | null;
    message?: string | null;
};

export type ServerInfoFragment = {
    __typename?: "Server";
    id: any;
    name: string;
    avatar?: { __typename?: "ImageMetadata"; path: string; type: string } | null;
    integrations: Array<{ __typename?: "Integration"; id: string; type: string }>;
    owners: Array<
        | { __typename?: "User"; id: any; username: string; privilege: Types.UserType }
        | { __typename?: "UserTemporary"; id: any; username: string; type: Types.UserTempType }
    >;
};

export const ResultFragFragmentDoc = {
    kind: "Document",
    definitions: [
        {
            kind: "FragmentDefinition",
            name: { kind: "Name", value: "ResultFrag" },
            typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Result" } },
            selectionSet: {
                kind: "SelectionSet",
                selections: [
                    { kind: "Field", name: { kind: "Name", value: "success" } },
                    { kind: "Field", name: { kind: "Name", value: "code" } },
                    { kind: "Field", name: { kind: "Name", value: "message" } },
                ],
            },
        },
    ],
} as unknown as DocumentNode<ResultFragFragment, unknown>;
export const ServerInfoFragmentDoc = {
    kind: "Document",
    definitions: [
        {
            kind: "FragmentDefinition",
            name: { kind: "Name", value: "ServerInfo" },
            typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Server" } },
            selectionSet: {
                kind: "SelectionSet",
                selections: [
                    { kind: "Field", name: { kind: "Name", value: "id" } },
                    { kind: "Field", name: { kind: "Name", value: "name" } },
                    {
                        kind: "Field",
                        name: { kind: "Name", value: "avatar" },
                        selectionSet: {
                            kind: "SelectionSet",
                            selections: [
                                { kind: "Field", name: { kind: "Name", value: "path" } },
                                { kind: "Field", name: { kind: "Name", value: "type" } },
                            ],
                        },
                    },
                    {
                        kind: "Field",
                        name: { kind: "Name", value: "integrations" },
                        selectionSet: {
                            kind: "SelectionSet",
                            selections: [
                                { kind: "Field", name: { kind: "Name", value: "id" } },
                                { kind: "Field", name: { kind: "Name", value: "type" } },
                            ],
                        },
                    },
                    {
                        kind: "Field",
                        name: { kind: "Name", value: "owners" },
                        selectionSet: {
                            kind: "SelectionSet",
                            selections: [
                                {
                                    kind: "InlineFragment",
                                    typeCondition: {
                                        kind: "NamedType",
                                        name: { kind: "Name", value: "User" },
                                    },
                                    selectionSet: {
                                        kind: "SelectionSet",
                                        selections: [
                                            { kind: "Field", name: { kind: "Name", value: "id" } },
                                            { kind: "Field", name: { kind: "Name", value: "username" } },
                                            { kind: "Field", name: { kind: "Name", value: "privilege" } },
                                        ],
                                    },
                                },
                                {
                                    kind: "InlineFragment",
                                    typeCondition: {
                                        kind: "NamedType",
                                        name: { kind: "Name", value: "UserTemporary" },
                                    },
                                    selectionSet: {
                                        kind: "SelectionSet",
                                        selections: [
                                            { kind: "Field", name: { kind: "Name", value: "id" } },
                                            { kind: "Field", name: { kind: "Name", value: "username" } },
                                            { kind: "Field", name: { kind: "Name", value: "type" } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    ],
} as unknown as DocumentNode<ServerInfoFragment, unknown>;
