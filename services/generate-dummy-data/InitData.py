from classes import Trade, Transaction, TransException

TRADES_INIT=[
Trade("73001300","ACC078","CDS","RED KEEP", "BLM","LCH", "2025-02-25T09:38:52", "2025-10-06T01:32:20", "CANCELLED"),
Trade("51883413","ACC089","CDS","HIGHGARDEN", "MARC","LCH", "2025-06-27T14:42:57", "2025-10-25T02:58:14", "CANCELLED"),
Trade("87472545","ACC070","CDS","HIGHGARDEN", "FIRELINK","LCH", "2025-04-08T13:29:00", "2025-08-09T06:52:13", "ALLEGED"),
Trade("84171052","ACC041","FX","KINGSLANDING", "FIRELINK","JSCC", "2025-06-20T13:12:13", "2025-10-28T13:54:07", "ALLEGED"),
Trade("25246501","ACC010","CDS","RED KEEP", "TRAI","CME", "2025-04-03T14:02:02", "2025-10-15T04:56:25", "CLEARED"),
Trade("67536228","ACC073","CDS","WINTERFELL", "TRAI","OTCCHK", "2025-03-31T13:20:44", "2025-08-21T04:08:50", "CLEARED"),
Trade("44289340","ACC048","CDS","HIGHGARDEN", "MARC","JSCC", "2025-02-05T03:38:42", "2025-08-05T19:34:29", "ALLEGED"),
Trade("54580528","ACC029","FX","RED KEEP", "FIRELINK","JSCC", "2025-04-06T04:44:25", "2025-08-28T05:57:33", "ALLEGED"),
Trade("60494436","ACC066","FX","KINGSLANDING", "TRAI","OTCCHK", "2025-06-26T12:42:56", "2025-10-31T15:34:00", "CLEARED"),
Trade("30157884","ACC036","FX","KINGSLANDING", "MARC","OTCCHK", "2025-04-08T01:47:11", "2025-09-03T00:02:47", "CANCELLED"),
Trade("96565146","ACC017","CDS","RED KEEP", "FIRELINK","JSCC", "2025-07-06T18:04:10", "2025-10-26T01:59:09", "ALLEGED"),
Trade("26654809","ACC050","FX","HIGHGARDEN", "FIRELINK","LCH", "2025-02-12T08:58:36", "2025-10-11T05:30:35", "CANCELLED"),
Trade("21873774","ACC035","IRS","KINGSLANDING", "TRAI","CME", "2025-03-14T00:34:13", "2025-09-20T06:25:11", "CANCELLED"),
Trade("15149979","ACC008","CDS","WINTERFELL", "BLM","LCH", "2025-02-17T04:26:56", "2025-10-12T22:59:18", "CANCELLED"),
Trade("44994216","ACC096","FX","WINTERFELL", "MARC","JSCC", "2025-02-18T17:15:26", "2025-10-24T10:23:28", "ALLEGED"),
Trade("85631648","ACC020","FX","HIGHGARDEN", "FIRELINK","OTCCHK", "2025-05-28T01:23:25", "2025-09-09T14:04:25", "ALLEGED"),
Trade("87841659","ACC082","FX","RED KEEP", "BLM","JSCC", "2025-05-24T02:34:28", "2025-10-07T23:22:55", "CLEARED"),
Trade("72840839","ACC026","CDS","WINTERFELL", "BLM","JSCC", "2025-04-28T10:09:41", "2025-09-26T16:06:00", "ALLEGED"),
Trade("98860229","ACC063","CDS","HIGHGARDEN", "BLM","OTCCHK", "2025-04-14T17:29:48", "2025-08-13T09:30:08", "REJECTED"),
Trade("21309141","ACC014","FX","WINTERFELL", "FIRELINK","OTCCHK", "2025-05-22T03:41:42", "2025-08-05T04:17:02", "CLEARED"),
Trade("87666057","ACC025","IRS","HIGHGARDEN", "FIRELINK","LCH", "2025-06-06T06:06:41", "2025-08-29T23:54:13", "CLEARED"),
Trade("64238205","ACC004","IRS","HIGHGARDEN", "FIRELINK","JSCC", "2025-03-13T01:07:42", "2025-09-17T11:46:48", "CLEARED"),
Trade("43458153","ACC018","CDS","WINTERFELL", "BLM","CME", "2025-03-06T09:21:27", "2025-10-29T02:45:41", "CLEARED"),
Trade("82105744","ACC039","IRS","RED KEEP", "FIRELINK","OTCCHK", "2025-05-09T04:32:40", "2025-09-11T21:51:14", "REJECTED"),
Trade("29290419","ACC009","CDS","RED KEEP", "BLM","OTCCHK", "2025-01-13T00:51:39", "2025-08-09T23:51:06", "REJECTED"),
Trade("30461963","ACC079","IRS","HIGHGARDEN", "MARC","CME", "2025-06-13T07:55:00", "2025-09-29T05:47:42", "CANCELLED"),
Trade("49364118","ACC007","IRS","RED KEEP", "TRAI","JSCC", "2025-05-15T11:25:39", "2025-10-15T11:55:55", "CLEARED"),
Trade("50038309","ACC065","IRS","HIGHGARDEN", "BLM","CME", "2025-05-14T05:44:23", "2025-09-07T06:49:54", "CANCELLED"),
Trade("70712244","ACC037","FX","HIGHGARDEN", "FIRELINK","JSCC", "2025-03-25T15:58:54", "2025-08-20T13:29:24", "CANCELLED"),
Trade("17881089","ACC090","IRS","RED KEEP", "FIRELINK","LCH", "2025-05-25T05:24:37", "2025-08-26T19:26:02", "CANCELLED"),
Trade("35526057","ACC057","FX","RED KEEP", "BLM","CME", "2025-02-22T15:51:53", "2025-09-12T03:33:17", "ALLEGED"),
Trade("22322060","ACC100","FX","HIGHGARDEN", "BLM","LCH", "2025-05-19T22:33:39", "2025-10-13T06:55:12", "ALLEGED"),
Trade("35141556","ACC055","CDS","HIGHGARDEN", "MARC","OTCCHK", "2025-06-25T18:55:37", "2025-09-05T03:02:05", "REJECTED"),
Trade("51259775","ACC044","CDS","KINGSLANDING", "FIRELINK","LCH", "2025-01-04T13:40:01", "2025-10-10T18:18:56", "ALLEGED"),
Trade("64428173","ACC051","IRS","HIGHGARDEN", "FIRELINK","OTCCHK", "2025-07-11T23:31:34", "2025-10-18T07:19:07", "CLEARED"),
Trade("83728843","ACC068","IRS","KINGSLANDING", "FIRELINK","OTCCHK", "2025-07-08T13:03:08", "2025-08-17T14:32:58", "CLEARED"),
Trade("61389948","ACC047","FX","KINGSLANDING", "FIRELINK","LCH", "2025-05-12T01:17:40", "2025-08-06T15:04:10", "CANCELLED"),
Trade("88020567","ACC069","IRS","WINTERFELL", "FIRELINK","CME", "2025-07-26T00:04:43", "2025-10-10T09:31:55", "CLEARED"),
Trade("63209277","ACC062","CDS","RED KEEP", "MARC","OTCCHK", "2025-04-26T14:44:31", "2025-08-08T13:42:26", "REJECTED"),
Trade("25200175","ACC098","IRS","RED KEEP", "BLM","JSCC", "2025-07-07T16:37:08", "2025-09-30T01:47:23", "ALLEGED"),
Trade("48871459","ACC080","CDS","RED KEEP", "BLM","CME", "2025-06-28T20:29:29", "2025-08-31T08:00:19", "CLEARED"),
Trade("93739599","ACC042","FX","WINTERFELL", "TRAI","JSCC", "2025-03-15T23:26:56", "2025-09-27T22:38:48", "ALLEGED"),
Trade("51089450","ACC059","FX","RED KEEP", "FIRELINK","OTCCHK", "2025-04-19T23:28:52", "2025-10-20T06:52:30", "CANCELLED"),
Trade("29055274","ACC049","FX","KINGSLANDING", "MARC","LCH", "2025-02-06T18:23:08", "2025-09-10T02:20:57", "REJECTED"),
Trade("39461893","ACC099","IRS","WINTERFELL", "FIRELINK","LCH", "2025-07-19T20:30:19", "2025-09-03T04:53:11", "CLEARED"),
Trade("69661274","ACC058","CDS","HIGHGARDEN", "TRAI","CME", "2025-01-12T09:54:59", "2025-08-10T12:08:34", "REJECTED"),
Trade("37158077","ACC076","IRS","KINGSLANDING", "TRAI","LCH", "2025-01-28T22:43:30", "2025-08-03T03:09:40", "CLEARED"),
Trade("11380595","ACC033","FX","KINGSLANDING", "TRAI","JSCC", "2025-02-05T23:29:48", "2025-10-04T15:06:51", "ALLEGED"),
Trade("40745908","ACC095","FX","RED KEEP", "FIRELINK","LCH", "2025-05-26T06:23:19", "2025-09-05T11:55:27", "ALLEGED"),
Trade("81459852","ACC060","IRS","HIGHGARDEN", "FIRELINK","CME", "2025-07-16T05:53:38", "2025-10-09T22:06:18", "CLEARED"),
Trade("87072563","ACC064","CDS","WINTERFELL", "FIRELINK","JSCC", "2025-01-13T09:12:41", "2025-10-30T11:03:22", "CLEARED"),
Trade("38302945","ACC030","CDS","WINTERFELL", "BLM","OTCCHK", "2025-01-04T14:59:29", "2025-09-26T10:51:09", "REJECTED"),
Trade("46902779","ACC002","FX","KINGSLANDING", "MARC","CME", "2025-07-10T06:53:24", "2025-09-13T22:23:55", "CLEARED"),
Trade("40547985","ACC053","CDS","WINTERFELL", "TRAI","LCH", "2025-05-05T03:22:24", "2025-09-12T13:33:52", "ALLEGED"),
Trade("63244917","ACC022","IRS","HIGHGARDEN", "BLM","OTCCHK", "2025-04-14T08:36:51", "2025-08-13T11:18:12", "REJECTED"),
Trade("66340127","ACC003","CDS","HIGHGARDEN", "MARC","CME", "2025-02-14T16:59:03", "2025-10-08T05:29:29", "REJECTED"),
Trade("73972538","ACC024","IRS","HIGHGARDEN", "MARC","JSCC", "2025-01-03T16:37:53", "2025-08-28T11:38:12", "CLEARED"),
Trade("36629187","ACC088","FX","WINTERFELL", "MARC","CME", "2025-07-12T12:52:04", "2025-09-09T14:48:19", "CLEARED"),
Trade("97897651","ACC021","FX","KINGSLANDING", "BLM","CME", "2025-02-07T09:38:55", "2025-10-16T16:04:08", "REJECTED"),
Trade("92282247","ACC061","FX","WINTERFELL", "TRAI","LCH", "2025-05-20T09:15:28", "2025-10-20T10:19:34", "ALLEGED"),
Trade("54344649","ACC072","FX","RED KEEP", "FIRELINK","CME", "2025-04-24T13:47:38", "2025-08-02T16:09:20", "ALLEGED"),
Trade("37807798","ACC093","CDS","KINGSLANDING", "BLM","OTCCHK", "2025-06-01T22:00:50", "2025-10-21T12:18:31", "CLEARED"),

Trade("69690882","ACC084","CDS","HIGHGARDEN", "TRAI","LCH", "2025-01-06T10:33:00", "2025-09-17T06:13:44", "ALLEGED"),
Trade("67447216","ACC071","CDS","WINTERFELL", "FIRELINK","OTCCHK", "2025-02-05T03:01:52", "2025-08-10T14:53:23", "ALLEGED"),
Trade("35821903","ACC133","FX","HIGHGARDEN", "TRAI","JSCC", "2025-03-15T08:15:22", "2025-08-25T16:42:11", "CLEARED"),
Trade("42198745","ACC0466","IRS","WINTERFELL", "FIRELINK","CME", "2025-02-28T14:20:45", "2025-09-05T10:33:18", "CLEARED"),

]

RESERVED_TRADES_INIT=[
Trade("54707890","ACC3848","CDS","KINGSLANDING", "TRAI","CME", "2025-08-31T18:24:09", "2025-08-31T18:24:09", "CLEARED"), #10 trans
Trade("91404528","ACC3147","CDS","KINGSLANDING", "MARC","CME", "2025-08-19T12:18:34", "2025-08-19T12:18:34", "CLEARED"), #20 trans
Trade("55623053","ACC7526","IRS","RED KEEP", "TRAI","JSCC", "2025-08-07T09:04:05", "2025-08-07T09:04:05", "ALLEGED"), #Ex1
Trade("68186799","ACC7944","FX","RED KEEP", "MARC","CME", "2025-08-09T03:00:44", "2025-08-09T03:00:44", "ALLEGED"), #Ex2
Trade("46195889","ACC7734","FX","HIGHGARDEN", "MARC","JSCC", "2025-08-28T04:55:52", "2025-08-28T04:55:52", "ALLEGED"), #Ex3

Trade("77194044","ACC040","IRS","KINGSLANDING", "MARC","LCH", "2025-06-20T11:44:53", "2025-08-19T19:46:50", "REJECTED"), #1
Trade("60724962","ACC023","IRS","RED KEEP", "BLM","OTCCHK", "2025-06-11T02:27:23", "2025-10-19T12:18:51", "REJECTED"), #2
Trade("86836834","ACC056","CDS","KINGSLANDING", "MARC","JSCC", "2025-03-06T02:30:51", "2025-09-21T13:53:27", "REJECTED"), #3
Trade("77186642","ACC043","CDS","KINGSLANDING", "BLM","LCH", "2025-05-06T10:22:19", "2025-09-17T05:19:29", "REJECTED"), #4
Trade("61270683","ACC016","FX","RED KEEP", "BLM","LCH", "2025-02-07T15:19:09", "2025-09-04T05:41:21", "REJECTED"), #5
Trade("98962729","ACC086","CDS","KINGSLANDING", "BLM","JSCC", "2025-06-03T15:20:25", "2025-08-04T02:56:57", "REJECTED"), #6
Trade("25399440","ACC028","IRS","RED KEEP", "BLM","LCH", "2025-03-14T17:49:34", "2025-09-30T18:30:21", "REJECTED"), #7
Trade("53850480","ACC094","CDS","KINGSLANDING", "TRAI","LCH", "2025-06-19T03:02:52", "2025-09-23T01:10:04", "REJECTED"), #8
Trade("89369810","ACC006","CDS","HIGHGARDEN", "TRAI","LCH", "2025-03-09T01:18:04", "2025-09-19T07:54:10", "REJECTED"), #9
Trade("99202386","ACC067","IRS","KINGSLANDING", "MARC","CME", "2025-06-03T09:18:07", "2025-09-15T01:19:26", "REJECTED"), #10
Trade("69269882","ACC084","FX","HIGHGARDEN", "TRAI","LCH", "2025-01-06T01:33:00", "2025-09-17T06:13:41", "REJECTED"), #11
Trade("42511774","ACC001","IRS","RED KEEP", "MARC","CME", "2025-02-19T14:21:49", "2025-08-24T05:16:20", "REJECTED"), #12 
Trade("48712564","ACC054","CDS","KINGSLANDING", "MARC","CME", "2025-05-04T09:45:44", "2025-09-22T21:34:55", "ALLEGED"), #13
Trade("14355627","ACC011","FX","RED KEEP", "MARC","JSCC", "2025-05-30T08:01:26", "2025-10-22T12:25:41", "ALLEGED"), #14
Trade("88531321","ACC074","IRS","WINTERFELL", "BLM","LCH", "2025-02-22T18:10:17", "2025-09-11T18:16:40", "CANCELLED"), #15
Trade("54146216","ACC071","CDS","WINTERFELL", "FIRELINK","OTCCHK", "2025-02-05T03:01:52", "2025-08-10T14:53:23", "REJECTED"), #16
Trade("72427554","ACC019","FX","KINGSLANDING", "FIRELINK","OTCCHK", "2025-01-29T18:09:08", "2025-10-15T18:00:51", "REJECTED"), #17
Trade("56535550","ACC034","IRS","KINGSLANDING", "TRAI","OTCCHK", "2025-06-28T20:24:44", "2025-09-20T17:32:04", "CANCELLED"), #18
Trade("67515456","ACC046","CDS","KINGSLANDING", "BLM","CME", "2025-04-03T02:22:13", "2025-09-20T19:30:02", "REJECTED"), #19
Trade("81930671","ACC031","FX","WINTERFELL", "BLM","OTCCHK", "2025-06-21T15:49:46", "2025-09-08T05:35:16", "CANCELLED"), #20
Trade("64737734","ACC005","IRS","RED KEEP", "TRAI","CME", "2025-07-11T20:34:21", "2025-09-14T16:15:46", "REJECTED"), #21
Trade("69755320","ACC045","CDS","WINTERFELL", "FIRELINK","LCH", "2025-06-09T04:32:02", "2025-09-07T08:09:03", "REJECTED"), #22
Trade("66663488","ACC091","FX","WINTERFELL", "FIRELINK","JSCC", "2025-04-09T08:41:20", "2025-09-06T20:32:37", "CANCELLED"), #23
Trade("15706882","ACC027","IRS","HIGHGARDEN", "TRAI","CME", "2025-05-02T05:36:03", "2025-10-21T00:10:47", "REJECTED"), #24
Trade("96904486","ACC081","CDS","WINTERFELL", "MARC","OTCCHK", "2025-04-06T03:53:48", "2025-10-08T00:29:04", "CANCELLED"), #25
Trade("49964172","ACC077","FX","HIGHGARDEN", "TRAI","OTCCHK", "2025-02-25T16:56:47", "2025-10-18T03:42:27", "REJECTED"), #26
Trade("42668494","ACC097","IRS","RED KEEP", "FIRELINK","JSCC", "2025-01-11T05:55:00", "2025-09-10T19:17:39", "REJECTED"), #27
Trade("98159040","ACC032","CDS","HIGHGARDEN", "FIRELINK","JSCC", "2025-01-26T00:10:59", "2025-09-19T04:19:48", "REJECTED"), #28
Trade("27625806","ACC013","FX","KINGSLANDING", "FIRELINK","CME", "2025-02-06T07:32:56", "2025-09-05T07:48:44", "CANCELLED"), #29
Trade("36106022","ACC012","IRS","KINGSLANDING", "MARC","OTCCHK", "2025-07-15T21:46:58", "2025-10-14T12:47:51", "REJECTED"), #30

Trade("33154292","ACC083","FX","RED KEEP", "MARC","OTCCHK", "2025-07-11T20:33:47", "2025-08-05T15:15:08", "CANCELLED"),
Trade("36349602","ACC092","FX","HIGHGARDEN", "BLM","OTCCHK", "2025-03-09T18:32:30", "2025-08-19T00:51:22", "CANCELLED"),
Trade("85373053","ACC075","IRS","WINTERFELL", "MARC","JSCC", "2025-03-15T06:02:15", "2025-09-10T02:08:38", "CANCELLED"),
Trade("76689540","ACC087","IRS","KINGSLANDING", "MARC","JSCC", "2025-01-30T23:12:55", "2025-10-22T06:33:30", "REJECTED"),
Trade("76369566","ACC052","FX","RED KEEP", "TRAI","LCH", "2025-07-12T14:54:36", "2025-09-11T04:42:38", "CANCELLED"),
Trade("73847580","ACC015","CDS","WINTERFELL", "MARC","LCH", "2025-06-06T21:03:05", "2025-10-12T21:54:42", "CANCELLED"),
Trade("17194044","ACC040","IRS","KINGSLANDING", "MARC","LCH", "2025-06-20T11:44:53", "2025-08-19T19:46:50", "REJECTED"),
Trade("58392014","ACC0982","CDS","RED KEEP", "MARC","LCH", "2025-07-12T18:55:30", "2025-10-02T22:14:05", "CANCELLED"),
Trade("50899479","ACC085","FX","WINTERFELL", "TRAI","CME", "2025-01-19T08:02:43", "2025-08-17T03:43:01", "CANCELLED"),
Trade("87339954","ACC038","IRS","RED KEEP", "MARC","OTCCHK", "2025-07-22T12:49:59", "2025-09-16T04:29:34", "CANCELLED"),
]

TRANSACTION_INIT=[
Transaction("21282644", "54707890", "2025-08-31T18:26:44", "OCTCCHK", "receive", "REQUEST_CONSENT", "CLEARED", "2025-08-31T18:26:44", 1),
Transaction("33481477", "54707890", "2025-08-31T18:31:38", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-31T18:31:38", 2),
Transaction("15178400", "54707890", "2025-08-31T18:32:35", "TAS", "receive", "CREDIT_APPROVE", "CLEARED", "2025-08-31T18:32:35", 3),
Transaction("99768484", "54707890", "2025-08-31T18:32:39", "OCTCCHK", "send", "CONSENT_GRANTED", "ALLEGED", "2025-08-31T18:32:39", 4),
Transaction("89698060", "54707890", "2025-08-31T18:36:58", "OCTCCHK", "receive", "STATUS_UPDATE", "CLEARED", "2025-08-31T18:36:58", 5),
Transaction("70264903", "54707890", "2025-08-31T18:39:58", "OCTCCHK", "receive", "CLEARING_CONFIRMED", "CLEARED", "2025-08-31T18:39:58", 6),
Transaction("51150161", "54707890", "2025-08-31T18:44:16", "WINTERFELL", "send", "CLEARED_TRADE", "CLEARED", "2025-08-31T18:44:16", 7),
Transaction("39130156", "54707890", "2025-08-31T18:44:53", "WINTERFELL", "receive", "CLEARED_TRADE", "CLEARED", "2025-08-31T18:44:53", 8),
Transaction("33775061", "54707890", "2025-08-31T18:46:39", "OCTCCHK", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-31T18:46:39", 9),
Transaction("74975320", "54707890", "2025-08-31T18:50:08", "TAS", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-31T18:50:08", 10),

Transaction("40019459", "91404528", "2025-08-19T12:19:00", "CME", "receive", "REQUEST_CONSENT", "CLEARED", "2025-08-19T12:19:00", 1),
Transaction("66394716", "91404528", "2025-08-19T12:22:59", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-19T12:22:59", 2),
Transaction("10196818", "91404528", "2025-08-19T12:26:09", "TAS", "receive", "CREDIT_APPROVE", "CLEARED", "2025-08-19T12:26:09", 3),
Transaction("51801058", "91404528", "2025-08-19T12:31:00", "CME", "send", "CONSENT_GRANTED", "ALLEGED", "2025-08-19T12:31:00", 4),
Transaction("89684241", "91404528", "2025-08-19T12:33:44", "CME", "receive", "STATUS_UPDATE", "CLEARED", "2025-08-19T12:33:44", 5),
Transaction("88833373", "91404528", "2025-08-19T12:37:23", "CME", "receive", "CLEARING_CONFIRMED", "CLEARED", "2025-08-19T12:37:23", 6),
Transaction("84008912", "91404528", "2025-08-19T12:38:08", "RED KEEP", "send", "CLEARED_TRADE", "CLEARED", "2025-08-19T12:38:08", 7),
Transaction("10546096", "91404528", "2025-08-19T12:43:05", "CME", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-19T12:43:05", 8),
Transaction("31313806", "91404528", "2025-08-19T12:43:23", "CME", "receive", "STATUS_UPDATE", "CLEARED", "2025-08-19T12:43:23", 9),
Transaction("11900072", "91404528", "2025-08-19T12:43:54", "TAS", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-19T12:43:54", 10),
Transaction("84606322", "91404528", "2025-08-19T12:47:56", "LCH", "send", "REQUEST_CONSENT", "CLEARED", "2025-08-19T12:47:56", 11),
Transaction("80440424", "91404528", "2025-08-19T12:48:19", "LCH", "receive", "CONSENT_GRANTED", "CLEARED", "2025-08-19T12:48:19", 12),
Transaction("85925696", "91404528", "2025-08-19T12:51:53", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-19T12:51:53", 13),
Transaction("53151687", "91404528", "2025-08-19T12:52:16", "TAS", "receive", "CREDIT_REJECT", "CLEARED", "2025-08-19T12:52:16", 14),
Transaction("17352428", "91404528", "2025-08-19T12:56:02", "LCH", "send", "CONSENT_REJECTED", "CLEARED", "2025-08-19T12:56:02", 15),
Transaction("91671421", "91404528", "2025-08-19T12:59:00", "LCH", "receive", "CLEARING_REFUSED", "CLEARED", "2025-08-19T12:59:00", 16),
Transaction("39119047", "91404528", "2025-08-19T13:03:09", "KINGSLANDING", "send", "CLEARED_TRADE", "CLEARED", "2025-08-19T13:03:09", 17),
Transaction("67417886", "91404528", "2025-08-19T13:05:15", "KINGSLANDING", "receive", "CLEARED_TRADE", "CLEARED", "2025-08-19T13:05:15", 18),
Transaction("10419302", "91404528", "2025-08-19T13:09:28", "KINGSLANDING", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-19T13:09:28", 19),
Transaction("31510116", "91404528", "2025-08-19T13:10:45", "TAS", "send", "SEND_TRADE_ID", "CLEARED", "2025-08-19T13:10:45", 20),

    #Ex1
Transaction("86149349", "55623053", "2025-08-07T09:05:44", "CME", "receive", "REQUEST_CONSENT", "CLEARED", "2025-08-07T09:05:44", 1),
Transaction("98680769", "55623053", "2025-08-07T09:08:31", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-07T09:08:31", 2),
Transaction("88242387", "55623053", "2025-08-07T09:12:18", "TAS", "receive", "CREDIT_REJECT", "REJECTED", "2025-08-07T09:12:18", 3),

    #Ex2
Transaction("81466877", "68186799", "2025-08-09T03:04:03", "LCH", "receive", "REQUEST_CONSENT", "CLEARED", "2025-08-09T03:04:03", 1),
Transaction("46170504", "68186799", "2025-08-09T03:08:50", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-09T03:08:50", 2),
Transaction("58746648", "68186799", "2025-08-09T03:13:17", "TAS", "receive", "CREDIT_APPROVE", "CLEARED", "2025-08-09T03:13:17", 3),
Transaction("26155050", "68186799", "2025-08-09T03:17:20", "LCH", "send", "REQUEST_CONSENT", "CLEARED", "2025-08-09T03:17:20", 4),
Transaction("15153056", "68186799", "2025-08-09T03:17:23", "LCH", "receive", "CONSENT_REJECTED", "REJECTED", "2025-08-09T03:17:23", 5),

    #Ex3
Transaction("62291938", "46195889", "2025-08-28T04:58:51", "CME", "receive", "REQUEST_CONSENT", "CLEARED", "2025-08-28T04:58:51", 1),
Transaction("12724611", "46195889", "2025-08-28T05:02:14", "TAS", "send", "CREDIT_CHECK", "CLEARED", "2025-08-28T05:02:14", 2),
Transaction("31113850", "46195889", "2025-08-28T05:05:38", "TAS", "receive", "CREDIT_APPROVE", "CLEARED", "2025-08-28T05:05:38", 3),
Transaction("33084149", "46195889", "2025-08-28T05:10:36", "CME", "send", "CONSENT_GRANTED", "ALLEGED", "2025-08-28T05:10:36", 4),
Transaction("73573614", "46195889", "2025-08-28T05:12:47", "CME", "receive", "CLEARING_CONFIRMED", "CLEARED", "2025-08-28T05:12:47", 5),
Transaction("97337730", "46195889", "2025-08-28T05:13:59", "KINGSLANDING", "send", "CLEARED_TRADE", "REJECTED", "2025-08-28T05:13:59", 6),
]

EXCEPTION_INIT=[
TransException("19757932", "55623053", "88242387", 'Credit limit exceeded for counterparty. Available credit: $5M, Required: $8M for IRS trade.', 'HIGH', 'PENDING', 'Awaiting credit committee review and approval for limit increase', '2025-08-07T09:12:25', '2025-08-07T09:12:25'),
TransException("86572959", "68186799", "15153056", 'LCH consent rejected due to incomplete LEI documentation. Counterparty LEI verification failed regulatory check.', 'HIGH', 'PENDING', 'Legal team contacted for updated LEI certificate', '2025-08-09T03:17:28', '2025-08-09T03:17:28'),
TransException("36485937", "46195889", "97337730", 'Booking system validation failed: Settlement account mismatch between clearing house (CME) and booking system (KINGSLANDING). Account reference data inconsistency detected.', 'MEDIUM', 'PENDING', 'Operations team investigating account mapping configuration', '2025-08-28T05:14:05', '2025-08-28T05:14:05'),

TransException("20001001", "77194044", "10001005", 'MiFID II transaction reporting failed: ARM (Approved Reporting Mechanism) connection timeout. Trade reporting to regulatory authority exceeded 15-minute deadline required by ESMA guidelines.', 'CRITICAL', 'PENDING', 'Compliance team escalated to IT for ARM system investigation', '2025-07-27T09:16:00', '2025-08-27T09:16:00'),
TransException("20002001", "60724962", "10002005", 'Initial margin call rejection: Required variation margin of $2.3M not available in segregated account. Current collateral balance $1.1M insufficient to meet OTCCHK clearing member requirements for IRS trade.', 'HIGH', 'PENDING', 'Collateral Management team reviewing available unencumbered assets for posting', '2024-02-02T10:31:00', '2024-02-02T10:31:00'),
TransException("20003001", "86836834", "10003004", 'ISDA Credit Support Annex (CSA) not on file for counterparty. CDS trade requires executed ISDA Master Agreement with CSA covering variation margin terms. Legal documentation check failed at JSCC clearing validation.', 'HIGH', 'PENDING', 'Legal team contacted counterparty for CSA execution status', '2024-04-09 14:35:30', '2024-04-09 14:35:30'),
TransException("20004001", "77186642", "10004005", 'Settlement instruction mismatch: Our SSI shows account BNY12345 at Bank of New York Mellon, but counterparty SSI references CITI98765 at Citibank. LCH requires matching settlement instructions for CDS premium payment processing.', 'MEDIUM', 'PENDING', 'Operations team reaching out to counterparty middle office for SSI confirmation', '2025-07-03 08:32:15', '2025-07-03 08:32:15'),
TransException("20005001", "61270683", "10005004", 'FX settlement date falls on Tokyo bank holiday (Marine Day - July 21, 2025). JPY leg cannot settle as Tokyo market closed. CLS (Continuous Linked Settlement) system rejected settlement instruction due to currency holiday conflict.', 'MEDIUM', 'PENDING', 'FX desk confirming alternative settlement date with counterparty', '2025-07-19 11:17:00', '2025-07-19 11:17:00'),
TransException("20006001", "98962729", "10006004", 'CDS reference entity under ISDA credit event review: Markit/IHS published Potential Credit Event Notice for underlying reference entity. JSCC suspended new CDS transactions on this name pending ISDA Determinations Committee ruling.', 'CRITICAL', 'PENDING', 'Credit Risk team monitoring ISDA DC meeting scheduled for January 25', '2025-01-24 13:55:00', '2025-01-24 13:55:00'),
TransException("20007001", "25399440", "10007004", 'IRS floating rate index validation failed: Trade references USD LIBOR 3M but LIBOR ceased publication June 2023. LCH clearing house requires Risk-Free Rate (RFR) based indices - must use SOFR (Secured Overnight Financing Rate) for USD swaps.', 'HIGH', 'PENDING', 'Rates desk confirming counterparty agreement to convert to SOFR-based swap', '2024-02-27 09:46:15', '2024-02-27 09:46:15'),
TransException("20008001", "53850480", "10008005", 'Gross notional exposure limit exceeded: Adding this $50M CDS would bring total CDS gross notional with this counterparty to $750M, exceeding our $700M counterparty exposure cap. LCH requires compression cycle to net down offsetting positions before accepting new trade.', 'MEDIUM', 'PENDING', 'Risk Management reviewing existing CDS portfolio for compression candidates', '2024-06-15 15:38:00', '2024-06-15 15:38:00'),
TransException("20009001", "89369810", "10009004", 'Wrong-way risk concentration alert: Trade involves selling CDS protection on financial sector entity where counterparty is also a financial institution. Combined financial sector CDS exposure exceeds 25% portfolio concentration limit per Basel III CVA (Credit Valuation Adjustment) guidelines.', 'HIGH', 'PENDING', 'Credit Risk committee reviewing concentration breach waiver request', '2024-12-29 10:28:00', '2024-12-29 10:28:00'),
TransException("20010001", "99202386", "10010005", 'Initial margin requirement spike: CME increased margin model sensitivity due to recent rate volatility. New trade requires additional $4.5M IM posting but our CSA threshold with counterparty is $5M. Current IM balance $3.2M means posting $4.5M would breach CSA threshold, requiring threshold increase negotiation.', 'HIGH', 'PENDING', 'Collateral Management team initiating CSA threshold amendment discussion with counterparty', '2025-11-17 14:22:00', '2025-11-17 14:22:00'),
TransException("20011001", "69269882", "10011005", 'SWIFT payment routing failure: MT202 payment instruction rejected due to correspondent bank SWIFT BIC code mismatch. Network reported BIC CHASUS33XXX deprecated, replacement BIC CHASUS33 required per SWIFT November 2025 directory update.', 'MEDIUM', 'PENDING', 'Treasury Operations updating correspondent bank static data', '2025-09-12 11:39:00', '2025-09-12 11:39:00'),
TransException("20012001", "42511774", "10012003", 'Counterparty credit rating downgrade: Moody''s downgraded counterparty from A2 to Baa1 during clearing process. This breaches our internal credit policy requiring minimum A3 rating for IRS counterparties. Trade approval suspended pending Credit Risk Committee review.', 'HIGH', 'PENDING', 'Credit Risk analyzing downgrade rationale and reviewing risk appetite', '2024-05-14 13:24:15', '2024-05-14 13:24:15'),
TransException("20013001", "48712564", "10013004", 'CDS succession event detected: Reference entity announced merger agreement with acquiring company. ISDA requires CDS contracts to transfer to successor entity, but successor determination pending ISDA Determinations Committee vote. Trading suspended until succession terms finalized.', 'MEDIUM', 'PENDING', 'Derivatives Legal team monitoring ISDA DC succession event deliberations', '2025-03-21 09:58:00', '2025-03-21 09:58:00'),
TransException("20014001", "14355627", "10014004", 'Capital flow restriction breach: CNY cross-border transaction exceeds daily quota of $50M set by SAFE (State Administration of Foreign Exchange). Current daily CNY outflow already at $47M, new $8M FX trade would breach limit. Requires overnight reset or SAFE approval.', 'MEDIUM', 'PENDING', 'Treasury desk reviewing CNY quota utilization and considering next-day settlement', '2024-08-19 15:42:30', '2024-08-19 15:42:30'),
TransException("20015001", "88531321", "10015004", 'Off-market rate detected: IRS fixed rate of 5.85% deviates significantly from market mid-rate of 5.12% (73 basis points premium). LCH automated validation flagged as potential operational error or inappropriate pricing. Requires trader confirmation and compliance review.', 'HIGH', 'PENDING', 'Trading desk verifying rate with counterparty and checking for upfront payment offset', '2025-10-08 10:31:15', '2025-10-08 10:31:15'),
TransException("20016001", "54146216", "10016004", 'LEI validation failure: Counterparty Legal Entity Identifier (LEI) 5493001KJTIIGC8Y1R12 has lapsed status in GLEIF database. LEI expired on November 1, 2024 and requires annual renewal. MiFID II and EMIR regulations mandate active LEI for all derivative counterparties.', 'HIGH', 'PENDING', 'Legal entity management team contacting counterparty for LEI renewal confirmation', '2024-11-22 14:21:00', '2024-11-22 14:21:00'),
TransException("20017001", "72427554", "10017004", 'AML screening alert triggered: Counterparty beneficial owner name flagged potential match (85% confidence) with OFAC (Office of Foreign Assets Control) sanctions list. Automated screening system requires manual compliance review before trade processing can proceed. Potential false positive due to common name.', 'CRITICAL', 'PENDING', 'Compliance conducting enhanced due diligence on beneficial ownership structure', '2025-06-30 16:35:30', '2025-06-30 16:35:30'),
TransException("20018001", "56535550", "10018005", 'Booking system integration failure: WINTERFELL booking system returned HTTP 503 service unavailable error. Unable to confirm trade booking and generate trade reference number. Database connection pool exhausted due to high trading volume. Trade stuck in alleged status pending system recovery.', 'MEDIUM', 'PENDING', 'IT Operations restarting WINTERFELL application servers and scaling database connections', '2024-09-05 12:02:15', '2024-09-05 12:02:15'),
TransException("20019001", "67515456", "10019004", 'CDS index version conflict: Trade references CDX.NA.IG Series 42 but series rolled to Series 43 on December 20, 2025 (roll date in 2 days). LCH policy prohibits new trades on off-the-run index series within 5 business days of roll date. Must trade on-the-run Series 43 or wait until roll completes.', 'MEDIUM', 'PENDING', 'Trading desk coordinating with counterparty to switch to on-the-run index series', '2025-12-18 13:43:00', '2025-12-18 13:43:00'),
TransException("20020001", "81930671", "10020005", 'Settlement instruction incomplete: GBP beneficiary bank details missing intermediary bank information. SWIFT payment routing requires intermediary bank (BARCGB22XXX - Barclays London) for final delivery to beneficiary account at Metro Bank. SSI validation failed due to incomplete correspondent banking chain.', 'MEDIUM', 'PENDING', 'Settlement Operations team obtaining full correspondent bank routing details', '2024-07-11 10:12:00', '2024-07-11 10:12:00'),
TransException("20021001", "64737734", "10021003", 'Clearing eligibility rejection: IRS trade submitted for cleared execution but counterparty is not OTCCHK clearing member. Trade must execute bilaterally with counterparty direct credit exposure. Clearing house membership required for central clearing per Dodd-Frank mandatory clearing rules exemption (notional below $8B threshold).', 'MEDIUM', 'PENDING', 'Trading desk converting to bilateral execution with ISDA documentation', '2025-04-16 14:34:30', '2025-04-16 14:34:30'),
TransException("20022001", "69755320", "10022004", 'Non-standard CDS maturity date: Trade maturity November 15, 2029 does not align with standard IMM dates (March/June/September/December 20th). JSCC clearing only accepts standard 5Y tenor maturing December 20, 2029. Custom maturity dates increase operational complexity and reduce liquidity.', 'LOW', 'PENDING', 'Derivatives Operations confirming standard maturity date with trading desk', '2024-10-29 10:53:30', '2024-10-29 10:53:30'),
TransException("20023001", "66663488", "10023005", 'FX settlement dual currency failure: EUR leg settlement instruction accepted by CLS but CHF leg rejected due to insufficient balance in CHF settlement account. CLS requires simultaneous settlement of both legs under PvP (Payment versus Payment) mechanism. CHF account short by 500k CHF.', 'HIGH', 'PENDING', 'Treasury Operations arranging CHF funding via overnight interbank market', '2025-05-23 15:35:40', '2025-05-23 15:35:40'),
TransException("20024001", "15706882", "10024005", 'Portfolio reconciliation break: LCH trade repository shows different trade economics than our booking system. Notional amount mismatch: LCH records $75M vs KINGSLANDING shows $70M. Reconciliation tolerance breach (7% variance exceeds 1% threshold). Requires trade amendment or system correction before clearing acceptance.', 'MEDIUM', 'PENDING', 'Middle Office investigating source of notional discrepancy between systems', '2024-12-03 11:49:20', '2024-12-03 11:49:20'),
TransException("20025001", "96904486", "10025004", 'CDS deliverable obligation restriction: Reference entity underwent debt restructuring in January 2025. Post-restructuring bonds no longer meet "Standard Reference Obligation" criteria per 2014 ISDA definitions. Deliverable obligation characteristics changed (subordinated debt, maturity reduced). Physical settlement may be impaired in credit event scenario.', 'MEDIUM', 'PENDING', 'Credit structuring team assessing impact of restructured reference obligations', '2025-02-07 09:41:30', '2025-02-07 09:41:30'),
TransException("20026001", "49964172", "10026004", 'Value date calculation error: Trade executed at 23:45 GMT (March 28) targeting spot settlement April 1st. However, AUD/USD spot convention uses Sydney business day for AUD leg. March 29 is Sydney public holiday (Good Friday), pushing AUD value date to April 2nd while USD settles April 1st. Asymmetric value dates not permitted.', 'MEDIUM', 'PENDING', 'FX Operations team recalculating value date considering both currency holiday calendars', '2024-03-29 00:01:00', '2024-03-29 00:01:00'),
TransException("20027001", "42668494", "10027003", 'Bilateral credit line exceeded: Current counterparty exposure $145M plus new trade PFE (Potential Future Exposure) $22M totals $167M, exceeding approved bilateral credit limit of $150M. Credit Risk policy requires limit increase approval before trade execution. Alternative: compress existing positions to free capacity.', 'HIGH', 'PENDING', 'Credit Risk analyzing limit increase request and portfolio compression options', '2025-08-14 12:31:30', '2025-08-14 12:31:30'),
TransException("20028001", "98159040", "10028005", 'DTCC trade affirmation timeout: Counterparty failed to affirm trade within 2-hour industry standard deadline. Trade remains in alleged status. Possible causes: counterparty operations backlog, system outage, trade details discrepancy preventing affirmation. Unaffirmed trades increase operational risk and delay clearing.', 'MEDIUM', 'PENDING', 'Middle Office contacting counterparty operations to expedite affirmation', '2024-06-18 12:48:45', '2024-06-18 12:48:45'),
TransException("20029001", "27625806", "10029005", 'Payment netting agreement missing: Multiple FX trades with counterparty settling same value date (November 7) but no ISDA Payment Netting Agreement on file. Gross settlement required for $15M USD payment despite offsetting $12M receivable, resulting in $27M gross cash movement instead of $3M net. Settlement risk and funding inefficiency.', 'LOW', 'PENDING', 'Legal documentation team initiating payment netting agreement negotiation', '2025-11-05 14:07:50', '2025-11-05 14:07:50'),
TransException("20030001", "36106022", "10030004", 'Amortizing swap notional schedule error: Trade confirmation shows 10-year amortizing IRS with annual notional reductions, but submitted schedule has payment date misalignment. Year 3 notional step-down date February 15, 2027 conflicts with quarterly payment schedule (March 15). LCH requires notional changes align with payment dates for operational processing.', 'MEDIUM', 'PENDING', 'Trading desk reconciling amortization schedule with payment frequency', '2024-01-17 09:55:40', '2024-01-17 09:55:40'),

TransException("20031001", "33154292", "10031001", 'Trade economics mismatch between front office capture and clearing submission. IRS fixed rate recorded as 4.92% in trading system but 4.29% submitted to clearing house. Variance exceeds 1bp tolerance threshold. Potential fat-finger error detected.', 'HIGH', 'PENDING', 'Trading desk validating original trade blotter and confirming correct rate prior to resubmission', '2025-09-02T10:15:00', '2025-09-02T10:15:00'),
TransException("20032001", "36349602", "10032001", 'Clearing house margin model updated intraday due to volatility event. Revised SPAN risk array increased initial margin requirement by 38%. Available collateral insufficient to meet updated CCP margin call.', 'CRITICAL', 'PENDING', 'Collateral team sourcing additional eligible collateral for urgent margin posting', '2025-10-21T14:22:10', '2025-10-21T14:22:10'),
TransException("20033001", "85373053", "10033001", 'EMIR trade reporting rejected by Trade Repository due to missing UTI (Unique Trade Identifier). Field 2.1 validation failed. Regulatory submission incomplete within T+1 deadline.', 'HIGH', 'PENDING', 'Operations generating UTI and resubmitting to trade repository before regulatory breach window', '2025-08-11T09:40:00', '2025-08-11T09:40:00'),
TransException("20034001", "76689540", "10034001", 'Interest rate DV01 portfolio limit exceeded. Adding new 30Y IRS increases portfolio DV01 to $1.8M per bp, breaching internal limit of $1.5M per bp for USD rates desk.', 'MEDIUM', 'PENDING', 'Risk management reviewing temporary limit override request from trading desk', '2025-07-15T13:25:00', '2025-07-15T13:25:00'),
TransException("20035001", "76369566", "10035001", 'Proposed cross-margining between IRS and CDS portfolios rejected. Counterparty account not enrolled in CCP cross-margin program. Margin offsets cannot be applied.', 'MEDIUM', 'PENDING', 'Clearing operations confirming cross-margin enrollment eligibility with CCP relationship manager', '2025-06-12T11:55:00', '2025-06-12T11:55:00'),
TransException("20036001", "73847580", "10036001", 'Proposed collateral asset ISIN XS0987654321 deemed ineligible under CCP collateral schedule. Corporate bond rated BB+ below minimum A- requirement for margin eligibility.', 'HIGH', 'PENDING', 'Collateral management substituting eligible government securities for margin posting', '2025-09-29 10:11:30', '2025-09-29 10:11:30'),
TransException("20037001", "17194044", "10037001", 'Trade selected for multilateral compression cycle but counterparty opted out of compression run. Trade lifecycle state conflict prevents clearing submission.', 'LOW', 'PENDING','Compression operations team coordinating next compression cycle participation', '2025-05-08T16:20:00', '2025-05-08T16:20:00'),
TransException("20038001", "58392014", "10038001", 'Clearing member default fund contribution recalculated following CCP stress test. Required contribution increased by $12M. Current funded amount insufficient to maintain active clearing status.','CRITICAL', 'PENDING', 'Treasury arranging capital allocation to meet updated CCP default fund requirement', '2025-11-03T09:12:45', '2025-11-03T09:12:45'),
TransException("20039001", "50899479", "10039001", 'Counterparty disputed trade confirmation details. Alleged discrepancy in notional amount and floating leg day count convention (ACT/360 vs ACT/365). Affirmation withheld pending reconciliation.', 'MEDIUM', 'PENDING', 'Middle Office reconciling economic terms with counterparty operations', '2025-08-19T12:48:00', '2025-08-19T12:48:00'),
TransException("20040001", "87339954,", "10040001", 'Historical backloaded OTC derivative rejected by clearing house. Trade execution date predates mandatory clearing start date and lacks required backloading documentation per regulatory transition rules.','HIGH', 'PENDING', 'Operations retrieving legacy documentation and confirming backloading eligibility criteria', '2025-07-01T10:00:00', '2025-07-01T10:00:00'),
]

EXCEPTION_MSGS=[

]
