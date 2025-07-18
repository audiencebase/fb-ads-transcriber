This Apify Actor acts as a connector between the Facebook Ads Scraper and the Audio and Video Transcriber. It orchestrates scraping of Facebook ads, sends each ad's video to the transcriber, and saves the transcription together with selected key ad metadata for streamlined analysis.

## Features

- **Orchestrates scraping and transcription** of Facebook video ads
- **Extracts specific ad metadata** only
- **Configurable ad search and video selection**
- **OpenAI powered** transcription
- **Robust error handling**
- **Concurrent processing** of video tasks
- **Flexible video URL extraction** with limits

## How it Works

1. Calls the Facebook Ads Scraper actor to gather ad data.
2. Extracts video URLs and essential details from each ad.
3. Sends videos to the Audio and Video Transcriber actor.
4. Combines transcription results with the selected ad metadata and outputs them.

## Input Configuration

See [`INPUT_SCHEMA.json`](INPUT_SCHEMA.json) for the complete schema. Important parameters include:

- **facebookAdsInput** – Object passed directly to the Facebook Ads Scraper actor.
- **openaiApiKey** *(required)* – Your OpenAI API key.
- **openaiModel** – Model used for transcription (`gpt-4o-mini-transcribe` or `whisper-1`).
- **openaiTranscriptionLanguage** – Language of the ads' audio. Default is `es`.
- **openaiTranscriptionPrompt** – Optional prompt for the transcription.
- **openaiTranscriptionTemperature** – Temperature for OpenAI transcription requests.
- **transcriberMaxConcurrentTasks** – Concurrency for the transcriber actor.
- **transcriberMaxRetries** – Retry count for the transcriber actor.
- **maxVideoUrlsPerAd** – Number of video URLs extracted from each ad (0 = no limit).

## Output Structure

The actor stores each processed ad in the default dataset with the following JSON structure:

```json
{
  "page_name": "String | Null",
  "Company Name": "String | Null",
  "Website": "String | Null",
  "caption": "String | Null",
  "cta_text": "String | Null",
  "cta_type": "String | Null",
  "title": "String | Null",
  "body": "String | Null",
  "download_url": "String | Null",
  "transcription": "String | Null",
  "status": "String",
  "error_message": "String | Null"
}
```

**Field descriptions**

| Field | Type | Description |
|-------|------|-------------|
| `page_name` | String\|Null | Name of the Facebook page posting the ad. |
| `Company Name` | String\|Null | Company name associated with the ad (if available). |
| `Website` | String\|Null | Website link from the ad details. |
| `caption` | String\|Null | Caption text from the ad snapshot. |
| `cta_text` | String\|Null | Call to action text. |
| `cta_type` | String\|Null | Call to action type. |
| `title` | String\|Null | Ad title. |
| `body` | String\|Null | Ad body text. |
| `download_url` | String\|Null | Video URL that was transcribed. |
| `transcription` | String\|Null | Transcribed text from the video. |
| `status` | String | Result of the transcription (`succeeded`, `failed`, `no_video_found`, `transcription_actor_no_output`, `transcription_failed`). |
| `error_message` | String\|Null | Error details if transcription failed. |

## Setup / Deployment on Apify

1. Create a new actor on Apify and upload the files from this repository.
2. The integration is preconfigured to use the Facebook Ads Scraper actor (`3853UUZQG6pjjdw11`) and the Video Transcriber actor (`LrpJOofkgRAe9PjY4`). Edit `main.js` only if you wish to use different actors.
3. Build the actor on the Apify platform.
4. Run the actor with your desired input parameters. All dependencies are installed automatically during the build.

## Important Notes / Limitations

- The OpenAI API key is sensitive and subject to rate limits and quotas.
- Video URLs may expire over time; transcription should be run soon after scraping.
- `maxVideoUrlsPerAd` controls how many videos from each ad are processed (0 processes all).

## Support / Contact

This template is provided as-is. For issues or questions, please reach out via your usual Apify support channels or open an issue in your repository.
