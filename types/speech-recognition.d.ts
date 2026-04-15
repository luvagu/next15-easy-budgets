/**
 * Web Speech API — self-contained ambient declarations.
 *
 * `lib.dom.d.ts` does not ship the SpeechRecognition interface. It lives in
 * `@types/dom-speech-recognition`, but that package uses `typesVersions` to
 * route TS ≤5.9 to a sub-directory, which the VSCode language server does not
 * always resolve correctly. Declaring everything here makes all tooling paths
 * consistent. When the @types package is also loaded by tsc the interfaces
 * merge cleanly (same members → no conflict).
 */

type SpeechRecognitionErrorCode =
	| 'aborted'
	| 'audio-capture'
	| 'bad-grammar'
	| 'language-not-supported'
	| 'network'
	| 'no-speech'
	| 'not-allowed'
	| 'service-not-allowed'

interface SpeechRecognitionAlternative {
	readonly confidence: number
	readonly transcript: string
}

interface SpeechRecognitionResult {
	readonly isFinal: boolean
	readonly length: number
	item(index: number): SpeechRecognitionAlternative
	[index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
	readonly length: number
	item(index: number): SpeechRecognitionResult
	[index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
	readonly resultIndex: number
	readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
	readonly error: SpeechRecognitionErrorCode
	readonly message: string
}

interface SpeechRecognition extends EventTarget {
	continuous: boolean
	grammars: SpeechGrammarList
	interimResults: boolean
	lang: string
	maxAlternatives: number
	onstart: ((ev: Event) => void) | null
	onend: ((ev: Event) => void) | null
	onresult: ((ev: SpeechRecognitionEvent) => void) | null
	onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
	onnomatch: ((ev: SpeechRecognitionEvent) => void) | null
	onaudiostart: ((ev: Event) => void) | null
	onaudioend: ((ev: Event) => void) | null
	onsoundstart: ((ev: Event) => void) | null
	onsoundend: ((ev: Event) => void) | null
	onspeechstart: ((ev: Event) => void) | null
	onspeechend: ((ev: Event) => void) | null
	start(audioTrack?: MediaStreamTrack): void
	stop(): void
	abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognition

// Augment Window with the vendor-prefixed and standard constructors
interface Window {
	SpeechRecognition?: SpeechRecognitionCtor
	webkitSpeechRecognition?: SpeechRecognitionCtor
}
