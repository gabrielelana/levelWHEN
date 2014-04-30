# Event Structure on Storage
* `$id`: Unique identifier (required)
* `$et`: Emit time, must be unique (required)
* `$nm`: Name aka the event category/type (required)
* `$sr`: Source, where the event was originated from (required)
* `$of`: Event unique identifier that originated this event
* Event data fields

# Key classes on Storage
* `$fs-`: Prefix of keys used to keep the fold status. The key is the index used for folding (ex. If you need to count how many commit per repository, then the repository id is the index used for folding). The value is all the values needed by the folding code (ex. If you only need to count things `{count: 0}` is enough
* `$et-`: Prefix of keys used to index events. The key is the timestamp. The value is the event itself. It's used to pull events out of a levelWHEN
* `$of-`: Prefix of keys used to avoid fold the same event more than one time. The key is the unique identifier of the incoming event that originated (during folding) other events. An incoming event with id `42` is folded, during folding one or more events could be emitted, the events and the fold status should be stored only if `$of-42` key doesn't exist. After the events and the fold status are stored then `$of-42` must be stored with value `true` (should be a batch insert?)
* `$pm-`: Prefix of keys used to keep the pull marker. The key is the name of the event source where are pulling events from. The value is the timestamp of the last event folded coming from the same source.
* When you emit events when folding you can specify an id (`id`) and a namespace (`ns`), the event would be stored with a key `ns-id`. The `id` should be unique

# Open Questions
* Without folding should we store the incoming event like an event emitted while folding? The only difference would be the absence of documents containing the folding status

# Ideas
* The events **Rectifier** could store incoming events that are coming in the wrong order in folding status document using the key `$fe` (aka Future Events)
