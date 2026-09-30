# Jelly focused RED receipt

Command from `sliding-stars-next`: `npm.cmd test -- tests/campaign/mechanics/jelly.test.ts`.

The initial sandbox attempt failed at Vite configuration startup with `EPERM` writing `node_modules/.vite-temp`; it did not test the rule. The same command was then rerun with workspace write escalation before implementation. That genuine RED run executed both initial jelly rule tests and failed 2/2 because lesson 711 was not yet authored. The parser reported `level: expected object` while `loadCampaignLevel` was given the missing level. This receipt transcribes the observed terminal outcome after the fact; the full original stdout was not redirected to a file. The final raw GREEN log is `focused-green.log` in this directory.
