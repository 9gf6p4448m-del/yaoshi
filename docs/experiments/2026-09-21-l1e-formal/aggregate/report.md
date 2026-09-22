# L1e fixed eight-arm formal measurement

Overall: fail; release eligible: false
Sample complete (all eight arms, seeds 1..10000): true

Source SHA256: 55046ee5df05e4b55ff137708ae99fbc089e7659ef865e217f35ac7faa7602aa
Tool SHA256: db939e43b3f90358b62456e9f01dfcef60b683bfd6bf81112b1ba7bf7a526a7c
Dependency SHA256: {"load":"b2f13f5523bd186508a7a6d41dcc7fbb1f4f9aefcf13239414495cac3ef1e5f1","balance":"25df18dd665191f160cc3f3863e017372f2ca7976c9acbdf8f0f144903c83e55","information":"fa1aa2d986229ab3c53426ca2564b8c4825141eee064177fa43ddea36b20f0a5"}
Git HEAD: 250b1da96663e49c083d6495c106e660d3304695

| Raw arm | Compressed SHA256 | Decoded SHA256 |
|---|---|---|
| h1-splitter | 08188098ed5d3d663e6669de2c458fd5e22435c40d5a328efb0df73bacfd1c48 | e452cea2d1b8a5387b6c28cc5c3ae4a04facaa24747fd9937b5d80fb7b837385 |
| h1-water | 02d2d67eeb86256b4a1d934a593343e676a8e6b04b777428d84c2f6ad367518b | d4db82a05cbbeba9ed517a23bca4bf6795cfd5ecc0f6ae8b9828224f51ac265c |
| h1-twinTiger | 1c84fd4427df972f36d8045e7167de268131efdd982decf30288fd313906d2b4 | e41711bbc2804b00a6acbf3190f92cc19171879fbed13cc3eefc1f2ae2d1f63f |
| h1-eyes | 1238d0d338d073e9563128ac6c45567da4122691817c650585186d575864f9c0 | 447d312a201594f6ed3905e14fa41a8a2198cd276a87f59821a4bb1e4209b595 |
| h9-normal | d90785eedbc279bd5f151ca26c2f99cba56a9c856d891be666bf10cc993c393f | 775f230ebe5f37acfa9710ca649e68b5591c7daabfafd8f13a1da05728962ddd |
| h9-zero-water | bfebfe1a40b5c36e412faf99660611d65cf4d07f3df031afa3d7cf7d1dbf88f8 | 6de19a689a20d59fae181ebca0de83aa544940b92cf078ae6717378c4f0a71fc |
| h9-zero-twinTiger | af7d5b88f23ade7dc174d89cccfdac8f46847ee3aa32e04d93a0090b8bd81850 | 056bf8f9a413cffdcf64070482373fda0dc56c79f7a607224bd20391be1cb054 |
| h9-zero-eyes | f713c9b921999b2144a69c4efc28c8b04a8ea5bf866f447c0e5b2050b0002f15 | a220b41d2098692cc531ffc500cde14616c2f2a21dca9549e351e0d28fd23b26 |

| H1 chain | Seat 0 wins | Splitter wins | Difference | Gate [-8,+5] |
|---|---:|---:|---:|---|
| water | 3359/10000 | 3157/10000 | 2.0200 pp | pass |
| eyes | 3213/10000 | 3157/10000 | 0.5600 pp | pass |
| twinTiger | 3261/10000 | 3157/10000 | 1.0400 pp | pass |

| H9 chain | Normal any-holder / winner-holder | Zero any-holder / winner-holder | Normal − zero | Normal ≤85% | Gate [+3,+10] |
|---|---:|---:|---:|---|---|
| water | 2356 / 1211 (51.40%) | 2356 / 1189 (50.47%) | 0.9338 pp | true | fail |
| eyes | 2178 / 1125 (51.65%) | 2178 / 1125 (51.65%) | 0.0000 pp | true | incomplete |
| twinTiger | 1631 / 740 (45.37%) | 1761 / 810 (46.00%) | -0.6257 pp | true | fail |

H1 is seat 0 qingmian with splitter / target chaser / informed eyes policies. H9 is a separate original scriptedBids seat 0 and AI opponents table.
H9 counts each game once if any of four seats ever held the chain; the winner must belong to that holder set. Normal and zero denominators differ, so their conditional difference is not causal.
H9 eyes is diagnostic because the original table does not consume eyes information. Full cross-night six-of-four remains incomplete.
The runner stops on seat 0 death. Seeds 1..200 overlap the earlier pilot; this run is not a holdout.
