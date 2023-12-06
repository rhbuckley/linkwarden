import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import CollectionSelection from "@/components/InputSelect/CollectionSelection";
import TagSelection from "@/components/InputSelect/TagSelection";
import TextInput from "@/components/TextInput";
import unescapeString from "@/lib/client/unescapeString";
import useLinkStore from "@/store/links";
import {
  ArchivedFormat,
  LinkIncludingShortenedCollectionAndTags,
} from "@/types/global";
import toast from "react-hot-toast";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCloudArrowDown,
  faLink,
  faTrashCan,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "../Modal";
import { faFileImage, faFilePdf } from "@fortawesome/free-regular-svg-icons";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

type Props = {
  onClose: Function;
  activeLink: LinkIncludingShortenedCollectionAndTags;
};

export default function PreservedFormatsModal({ onClose, activeLink }: Props) {
  const session = useSession();
  const { links, getLink } = useLinkStore();

  const [link, setLink] =
    useState<LinkIncludingShortenedCollectionAndTags>(activeLink);

  const router = useRouter();

  useEffect(() => {
    let isPublicRoute = router.pathname.startsWith("/public")
      ? true
      : undefined;

    (async () => {
      const data = await getLink(link.id as number, isPublicRoute);
      setLink(
        (data as any).response as LinkIncludingShortenedCollectionAndTags
      );
    })();

    let interval: NodeJS.Timer | undefined;
    if (link?.screenshotPath === "pending" || link?.pdfPath === "pending") {
      interval = setInterval(async () => {
        const data = await getLink(link.id as number, isPublicRoute);
        setLink(
          (data as any).response as LinkIncludingShortenedCollectionAndTags
        );
      }, 5000);
    } else {
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [link?.screenshotPath, link?.pdfPath, link?.readabilityPath]);

  const updateArchive = async () => {
    const load = toast.loading("Sending request...");

    const response = await fetch(`/api/v1/links/${link?.id}/archive`, {
      method: "PUT",
    });

    const data = await response.json();

    toast.dismiss(load);

    if (response.ok) {
      toast.success(`Link is being archived...`);
      getLink(link?.id as number);
    } else toast.error(data.response);
  };

  const handleDownload = (format: ArchivedFormat) => {
    const path = `/api/v1/archives/${link?.id}?format=${format}`;
    fetch(path)
      .then((response) => {
        if (response.ok) {
          // Create a temporary link and click it to trigger the download
          const link = document.createElement("a");
          link.href = path;
          link.download = format === ArchivedFormat.png ? "Screenshot" : "PDF";
          link.click();
        } else {
          console.error("Failed to download file");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return (
    <Modal toggleModal={onClose}>
      <p className="text-xl font-thin">Preserved Formats</p>

      <div className="divider mb-3 mt-1"></div>

      <div className={`flex flex-col gap-3`}>
        {link?.screenshotPath && link?.screenshotPath !== "pending" ? (
          <div className="flex justify-between items-center pr-1 border border-neutral-content rounded-md">
            <div className="flex gap-2 items-center">
              <div className="bg-primary text-primary-content p-2 rounded-l-md">
                <FontAwesomeIcon icon={faFileImage} className="w-6 h-6" />
              </div>

              <p>Screenshot</p>
            </div>

            <div className="flex gap-1">
              <div
                onClick={() => handleDownload(ArchivedFormat.png)}
                className="cursor-pointer hover:opacity-60 duration-100 p-2 rounded-md"
              >
                <FontAwesomeIcon
                  icon={faCloudArrowDown}
                  className="w-5 h-5 cursor-pointer text-neutral"
                />
              </div>

              <Link
                href={`/api/v1/archives/${link?.id}?format=${
                  link.screenshotPath.endsWith("png")
                    ? ArchivedFormat.png
                    : ArchivedFormat.jpeg
                }`}
                target="_blank"
                className="cursor-pointer hover:opacity-60 duration-100 p-2 rounded-md"
              >
                <FontAwesomeIcon
                  icon={faUpRightFromSquare}
                  className="w-5 h-5 text-neutral"
                />
              </Link>
            </div>
          </div>
        ) : undefined}

        {link?.pdfPath && link.pdfPath !== "pending" ? (
          <div className="flex justify-between items-center pr-1 border border-neutral-content rounded-md">
            <div className="flex gap-2 items-center">
              <div className="bg-primary text-primary-content p-2 rounded-l-md">
                <FontAwesomeIcon icon={faFilePdf} className="w-6 h-6" />
              </div>

              <p>PDF</p>
            </div>

            <div className="flex gap-1">
              <div
                onClick={() => handleDownload(ArchivedFormat.pdf)}
                className="cursor-pointer hover:opacity-60 duration-100 p-2 rounded-md"
              >
                <FontAwesomeIcon
                  icon={faCloudArrowDown}
                  className="w-5 h-5 cursor-pointer text-neutral"
                />
              </div>

              <Link
                href={`/api/v1/archives/${link?.id}?format=${ArchivedFormat.pdf}`}
                target="_blank"
                className="cursor-pointer hover:opacity-60 duration-100 p-2 rounded-md"
              >
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="w-5 h-5 text-neutral"
                />
              </Link>
            </div>
          </div>
        ) : undefined}

        <div className="flex flex-col-reverse sm:flex-row sm:gap-3 items-center justify-center">
          {link?.collection.ownerId === session.data?.user.id ? (
            <div
              className={`btn btn-accent text-white ${
                link?.pdfPath &&
                link?.screenshotPath &&
                link?.pdfPath !== "pending" &&
                link?.screenshotPath !== "pending"
                  ? "mt-3"
                  : ""
              }`}
              onClick={() => updateArchive()}
            >
              <div>
                <p>Update Preserved Formats</p>
                <p className="text-xs">(Refresh Link)</p>
              </div>
            </div>
          ) : undefined}
          <Link
            href={`https://web.archive.org/web/${link?.url?.replace(
              /(^\w+:|^)\/\//,
              ""
            )}`}
            target="_blank"
            className={`text-neutral duration-100 hover:opacity-60 flex gap-2 w-fit items-center text-sm ${
              link?.pdfPath &&
              link?.screenshotPath &&
              link?.pdfPath !== "pending" &&
              link?.screenshotPath !== "pending"
                ? "sm:mt-3"
                : ""
            }`}
          >
            <p className="whitespace-nowrap">
              View Latest Snapshot on archive.org
            </p>
            <FontAwesomeIcon
              icon={faArrowUpRightFromSquare}
              className="w-4 h-4"
            />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
