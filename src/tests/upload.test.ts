import { getLocalFiles } from 'services/fileService';
import { getLocalCollections } from 'services/collectionService';
import { getUserDetailsV2 } from 'services/userService';
import { groupFilesBasedOnCollectionID } from 'utils/file';

export async function testUpload() {
    if (!process.env.NEXT_PUBLIC_EXPECTED_JSON_PATH) {
        throw Error(
            'upload test failed NEXT_PUBLIC_EXPECTED_JSON_PATH missing'
        );
    }
    const expectedState = await import(
        process.env.NEXT_PUBLIC_EXPECTED_JSON_PATH
    );
    if (!expectedState) {
        throw Error('upload test failed expectedState missing');
    }

    try {
        await totalFileCountCheck(expectedState);
        await totalCollectionCountCheck(expectedState);
        await collectionWiseFileCount(expectedState);
        await thumbnailGenerationFailedFilesCheck(expectedState);
        await exifDataParsingCheck(expectedState);
    } catch (e) {
        console.log(e);
    }
}

async function totalFileCountCheck(expectedState) {
    const userDetails = await getUserDetailsV2();
    if (expectedState['total_file_count'] === userDetails.fileCount) {
        console.log('file count check passed ✅');
    } else {
        throw Error(
            `total file count check failed ❌, expected: ${expectedState['total_file_count']},  got: ${userDetails.fileCount}`
        );
    }
}

async function totalCollectionCountCheck(expectedState) {
    const collections = await getLocalCollections();
    const files = await getLocalFiles();
    const nonEmptyCollectionIds = new Set(
        files.map((file) => file.collectionID)
    );
    const nonEmptyCollections = collections.filter((collection) =>
        nonEmptyCollectionIds.has(collection.id)
    );
    if (expectedState['collection_count'] === nonEmptyCollections.length) {
        console.log('collection count check passed ✅');
    } else {
        throw Error(
            `total Collection count check failed ❌
                expected : ${expectedState['collection_count']},  got: ${collections.length}`
        );
    }
}

async function collectionWiseFileCount(expectedState) {
    const files = await getLocalFiles();
    const collections = await getLocalCollections();
    const collectionToFilesMap = groupFilesBasedOnCollectionID(files);
    const collectionIDToNameMap = new Map(
        collections.map((collection) => [collection.id, collection.name])
    );
    const collectionNameToFileCount = new Map(
        [...collectionToFilesMap.entries()].map(([collectionID, files]) => [
            collectionIDToNameMap.get(collectionID),
            files.length,
        ])
    );
    Object.entries(expectedState['collection_files_count']).forEach(
        ([collectionName, fileCount]) => {
            if (fileCount !== collectionNameToFileCount.get(collectionName)) {
                throw Error(
                    `collectionWiseFileCount check failed ❌
                        for collection ${collectionName}
                        expected File count : ${fileCount} ,  got: ${collectionNameToFileCount.get(
                        collectionName
                    )}`
                );
            }
        }
    );
    console.log('collection wise file count check passed ✅');
}

async function thumbnailGenerationFailedFilesCheck(expectedState) {
    const files = await getLocalFiles();
    const filesWithStaticThumbnail = files.filter(
        (file) => file.metadata.hasStaticThumbnail
    );

    const fileIDSet = new Set();
    const uniqueFilesWithStaticThumbnail = filesWithStaticThumbnail.filter(
        (file) => !fileIDSet.has(file.id)
    );
    const fileNamesWithStaticThumbnail = uniqueFilesWithStaticThumbnail.map(
        (file) => file.metadata.title
    );

    if (
        expectedState['thumbnail_generation_failure']['count'] !==
        uniqueFilesWithStaticThumbnail.length
    ) {
        throw Error(
            `thumbnailGenerationFailedFiles Count Check failed ❌
                expected: ${expectedState['thumbnail_generation_failure']['count']},  got: ${uniqueFilesWithStaticThumbnail.length}`
        );
    }
    expectedState['thumbnail_generation_failure']['files'].forEach(
        (fileName) => {
            if (!fileNamesWithStaticThumbnail.includes(fileName)) {
                throw Error(
                    `thumbnailGenerationFailedFiles Check failed ❌
                        expected: ${expectedState['thumbnail_generation_failure']['files']},  got: ${fileNamesWithStaticThumbnail}`
                );
            }
        }
    );
    console.log('thumbnail generation failure test passed ✅');
}

async function exifDataParsingCheck(expectedState) {
    const files = await getLocalFiles();
    Object.entries(expectedState['exif']).map(([fileName, exifValues]) => {
        const matchingFile = files.find(
            (file) => file.metadata.title === fileName
        );
        if (!matchingFile) {
            throw Error(`exifDataParsingCheck failed , ${fileName} missing`);
        }
        if (
            exifValues['creation_time'] &&
            exifValues['creation_time'] !== matchingFile.metadata.creationTime
        ) {
            throw Error(`exifDataParsingCheck failed ❌ ,
                            for ${fileName}
                            expected: ${exifValues['creation_time']} got: ${matchingFile.metadata.creationTime}`);
        }
        if (
            exifValues['location'] &&
            (exifValues['location']['latitude'] !==
                matchingFile.metadata.latitude ||
                exifValues['location']['longitude'] !==
                    matchingFile.metadata.longitude)
        ) {
            throw Error(`exifDataParsingCheck failed ❌  ,
                            for ${fileName}
                            expected: ${JSON.stringify(exifValues['location'])}
                            got: [${matchingFile.metadata.latitude},${
                matchingFile.metadata.latitude
            }]`);
        }
    });
    console.log('exif data parsing check passed ✅');
}
