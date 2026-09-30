<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## MediLens structure
- Report AI logic lives in `src/lib/medilens.server.ts` (server-only) and is exposed through `createServerFn` wrappers in `src/lib/medilens.functions.ts`, so browser code never sees prompts or keys.
- Reference-range status is always computed from the range printed on the report; never a generic range, so MediLens cannot imply a diagnosis.
- All AI-generated medical text passes `sanitizeMedicalText` before storage/display to strip diagnosing, prescribing or certainty wording.
- Curated test education lives in `src/lib/test-knowledge.ts` (MedlinePlus-based, en/ta/hi); UI prefers it over AI text so causes/factors are never AI-invented.
- Ask MediLens answers via `askMediLens` server fn using only verified report rows plus curated knowledge.
