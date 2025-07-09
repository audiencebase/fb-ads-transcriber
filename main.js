const Apify = require('apify');

// Actor IDs for the Facebook Ads Scraper and the Video Transcriber.
// Change these if you want to use different actors.
const FACEBOOK_ADS_SCRAPER_ACTOR_ID = '3853UUZQG6pjjdw11';
const VIDEO_TRANSCRIBER_ACTOR_ID = 'LrpJOofkgRAe9PjY4';

Apify.main(async () => {
    const input = await Apify.getInput() || {};
    const {
        facebookAdsInput = {},
        openaiApiKey,
        openaiModel = 'gpt-4o-mini-transcribe',
        openaiTranscriptionLanguage = 'es',
        openaiTranscriptionPrompt,
        openaiTranscriptionTemperature = '0.0',
        transcriberMaxConcurrentTasks = 5,
        transcriberMaxRetries = 3,
        maxVideoUrlsPerAd = 1,
    } = input;

    if (!openaiApiKey) {
        throw new Error('Input "openaiApiKey" is required.');
    }

    // Step 1: Run Facebook Ads Scraper
    const fbRun = await Apify.call(FACEBOOK_ADS_SCRAPER_ACTOR_ID, facebookAdsInput);
    const fbDataset = await Apify.openDataset(fbRun.defaultDatasetId);

    const requestQueue = await Apify.openRequestQueue();

    await fbDataset.forEach(async (item) => {
        const metadata = extractMetadata(item);
        const snapshot = item.snapshot || {};
        const videoUrls = extractVideoUrls(snapshot, maxVideoUrlsPerAd);

        if (videoUrls.length === 0) {
            await Apify.pushData({
                ...metadata,
                download_url: null,
                transcription: null,
                status: 'no_video_found',
                error_message: null,
            });
            return;
        }

        for (const videoUrl of videoUrls) {
            await requestQueue.addRequest({
                url: videoUrl,
                userData: { metadata, videoUrl },
            });
        }
    });

    const crawler = new Apify.BasicCrawler({
        requestQueue,
        maxConcurrency: 5,
        maxRequestsPerMinute: 10,
        handleRequestFunction: async ({ request }) => {
            const { metadata, videoUrl } = request.userData;
            try {
                const run = await Apify.call(VIDEO_TRANSCRIBER_ACTOR_ID, {
                    video_urls: [videoUrl],
                    openai_api_key: openaiApiKey,
                    openai_model: openaiModel,
                    openai_transcription_language: openaiTranscriptionLanguage,
                    openai_transcription_prompt: openaiTranscriptionPrompt,
                    openai_transcription_temperature: openaiTranscriptionTemperature,
                    max_concurrent_tasks: transcriberMaxConcurrentTasks,
                    max_retries: transcriberMaxRetries,
                });
                const ds = await Apify.openDataset(run.defaultDatasetId);
                const { items } = await ds.getData({ limit: 1 });
                if (items.length) {
                    const { transcription = null, download_url = videoUrl, status = 'succeeded', error_message = null } = items[0];
                    await Apify.pushData({ ...metadata, download_url, transcription, status, error_message });
                } else {
                    await Apify.pushData({ ...metadata, download_url: videoUrl, transcription: null, status: 'transcription_actor_no_output', error_message: null });
                }
            } catch (err) {
                await Apify.pushData({ ...metadata, download_url: videoUrl, transcription: null, status: 'transcription_failed', error_message: err.message });
            }
        },
    });

    await crawler.run();
});

function extractMetadata(item) {
    const snapshot = item.snapshot || {};
    const firstCard = Array.isArray(snapshot.cards) && snapshot.cards[0] ? snapshot.cards[0] : {};
    return {
        page_name: item.page_name || '',
        "Company Name": item['Company Name'] || '',
        Website: item.Website || '',
        caption: snapshot.caption || '',
        cta_text: (firstCard.cta_text || snapshot.cta_text) || '',
        cta_type: (firstCard.cta_type || snapshot.cta_type) || '',
        title: (firstCard.title || snapshot.title) || '',
        body: ((firstCard.body && firstCard.body.text) || (snapshot.body && snapshot.body.text)) || '',
    };
}

function extractVideoUrls(snapshot, limit) {
    const urls = [];
    if (!snapshot) return urls;

    const addUrl = (url) => {
        if (!url) return;
        if (/^https?:\/\//i.test(url) && !urls.includes(url)) {
            urls.push(url);
        }
    };

    const maybeAdd = (video) => {
        if (!video) return;
        addUrl(video.video_sd_url || video.video_hd_url || video.original_video_url);
    };

    if (Array.isArray(snapshot.videos)) {
        for (const vid of snapshot.videos) {
            maybeAdd(vid);
            if (limit > 0 && urls.length >= limit) return urls;
        }
    }

    if (Array.isArray(snapshot.extra_videos) && (limit === 0 || urls.length < limit)) {
        for (const vid of snapshot.extra_videos) {
            maybeAdd(vid);
            if (limit > 0 && urls.length >= limit) return urls;
        }
    }

    if (Array.isArray(snapshot.cards) && (limit === 0 || urls.length < limit)) {
        for (const card of snapshot.cards) {
            addUrl(card.video_sd_url || card.video_hd_url);
            if (limit > 0 && urls.length >= limit) return urls;
        }
    }

    return urls;
}
