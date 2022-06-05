import React from "react";
import { DateTime } from "luxon";

import ChevronUp from "mdi-react/ChevronUpIcon";
import ChevronDown from "mdi-react/ChevronDownIcon";
import reactStringReplace from "react-string-replace";

import { IEmbedParams } from "./Interface";

import EpisodeCard from "./Episode";
import { ValidAccent } from "../ColorMap";
import ReactTimeAgoLocale from "../TimeAgo";

import { Locale, LocaleMap, translate, ValidLocale } from "../../i18n";
import { Project } from "@prisma/client";

function getSeason(month: number, year: number, locale: Locale): string {
    const yearS = year.toString();
    if (month >= 0 && month <= 2) {
        return `❄ ${translate("SEASON.WINTER", locale, [yearS])}`;
    }
    if (month >= 3 && month <= 5) {
        return `🌸 ${translate("SEASON.SPRING", locale, [yearS])}`;
    }
    if (month >= 6 && month <= 8) {
        return `☀ ${translate("SEASON.SUMMER", locale, [yearS])}`;
    }
    if (month >= 9 && month <= 11) {
        return `🍂 ${translate("SEASON.FALL", locale, [yearS])}`;
    }
    if (month >= 12) {
        return `❄ ${translate("SEASON.WINTER", locale, [yearS])}`;
    }
}

function InfoIconBottom() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 align-middle self-center"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
            />
        </svg>
    );
}

const borderTop = {
    borderTopWidth: "3px",
};

interface EmbedPageCardProps extends IEmbedParams {
    animeData: Project;
}

interface EmbedPageCardState {
    dropdownOpen: boolean;
}

class EmbedPageCard extends React.Component<EmbedPageCardProps, EmbedPageCardState> {
    constructor(props: EmbedPageCardProps) {
        super(props);
        this.toggleDrop = this.toggleDrop.bind(this);
        this.state = {
            dropdownOpen: false,
        };
    }

    componentDidUpdate() {
        const message = JSON.stringify({ action: "resize", height: window.document.body.scrollHeight });
        // Broadcast resize action to everyone.
        window.parent.postMessage(message, "*");
    }

    toggleDrop() {
        const { dropdownOpen } = this.state;
        this.setState({ dropdownOpen: !dropdownOpen });
    }

    render() {
        const { animeData, accent, lang } = this.props;
        const { dropdownOpen } = this.state;

        let realAccent = "green";
        if (ValidAccent.includes(accent)) {
            realAccent = accent;
        }
        let realLang: keyof typeof LocaleMap = "id";
        if (ValidLocale.includes(lang)) {
            realLang = lang;
        }

        const { id, title, poster_data, status, last_update, start_time } = animeData;
        const { url: poster_url } = poster_data;

        const unfinishedEpisode = status.filter((episode) => !episode.is_done);
        if (unfinishedEpisode.length < 1) {
            return null;
        }
        const firstEpisode = unfinishedEpisode[0];
        const next3Episode = unfinishedEpisode.slice(1, 4);

        const bordering =
            realAccent === "none" ? "border-none" : `rounded-t-none border-t-4 role-accent-${realAccent}`;

        const buttonColor = dropdownOpen
            ? "text-gray-500 hover:text-gray-400 dark:text-gray-300"
            : "text-blue-500 hover:text-blue-400 dark:text-blue-300";

        const lastUpdated = translate("LAST_UPDATE", realLang) as string;
        const startTime = DateTime.fromSeconds(start_time, { zone: "UTC" });

        const extraHiddenThing = dropdownOpen ? "" : "hidden ";

        return (
            <>
                <div
                    className={
                        "shadow-md rounded-md overflow-hidden flex flex-row items-start relative bg-white dark:bg-gray-800 " +
                        bordering
                    }
                    style={realAccent === "nonde" ? {} : borderTop}
                >
                    <div className="hidden sm:block w-24 mt-3 ml-3 mb-8 relative flex-none">
                        <img
                            className="z-0 rounded-md"
                            src={poster_url}
                            alt={"Poster untuk Proyek " + title}
                        />
                    </div>
                    <div className="text-xs h-full flex-grow px-3 pt-2 py-8 max-w-full flex flex-col">
                        <h1 className="font-medium text-base text-gray-800 dark:text-gray-100">{title}</h1>
                        <div>
                            <EpisodeCard
                                key={`episode-card-${id}-${firstEpisode.episode}`}
                                episode={firstEpisode.episode}
                                airingAt={firstEpisode.airtime}
                                progress={firstEpisode.progress}
                                lang={realLang}
                                delayReason={firstEpisode.delay_reason}
                            />
                        </div>
                        {next3Episode.length > 0 ? (
                            <>
                                <div className={extraHiddenThing + "grid grid-cols-2 justify-between"}>
                                    {next3Episode.map((ep) => {
                                        return (
                                            <EpisodeCard
                                                key={`episode-card-${id}-${ep.episode}`}
                                                episode={ep.episode}
                                                airingAt={ep.airtime}
                                                progress={ep.progress}
                                                lang={realLang}
                                            />
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={this.toggleDrop}
                                    className={
                                        "flex flex-row mt-2 items-center transition hover:opacity-80 focus:outline-none " +
                                        buttonColor
                                    }
                                >
                                    <div className="h-5 w-5">
                                        {dropdownOpen ? (
                                            <ChevronUp className="-ml-1" />
                                        ) : (
                                            <ChevronDown className="-ml-1" />
                                        )}
                                    </div>
                                    {dropdownOpen ? (
                                        <div className="mt-1">{translate("DROPDOWN.RETRACT", realLang)}</div>
                                    ) : (
                                        <div className="mt-1">
                                            {translate("DROPDOWN.EXPAND", realLang, [
                                                next3Episode.length.toString(),
                                            ])}
                                        </div>
                                    )}
                                </button>
                            </>
                        ) : null}
                    </div>
                    <div>
                        <div className="absolute bottom-2 left-3 text-xs text-gray-400 dark:text-gray-300">
                            <div className="flex flex-row gap-1 text-left">
                                <div>
                                    {firstEpisode.delay_reason && (
                                        <div
                                            className="inline-block align-top mr-0.5 text-yellow-400 cursor-pointer"
                                            title={firstEpisode.delay_reason}
                                        >
                                            <InfoIconBottom />
                                        </div>
                                    )}
                                    {reactStringReplace(lastUpdated, "{0}", () => {
                                        return (
                                            <ReactTimeAgoLocale
                                                key={`utang-${id}-ts-${last_update}`}
                                                unix={last_update}
                                                locale={realLang}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-300">
                            <div className="flex flex-row text-right">
                                <span>{getSeason(startTime.month, startTime.year, realLang)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

export default EmbedPageCard;
