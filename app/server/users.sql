CREATE TABLE IF NOT EXISTS `users` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `accountStatus` varchar(20) NOT NULL,
  `googleId` varchar(21),
  `googleImage` varchar(120),
  `googleEmail` varchar(30),
  `name` varchar(40),
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

