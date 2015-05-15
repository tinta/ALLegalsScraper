CREATE TABLE IF NOT EXISTS `users` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `accountIsActive` boolean NOT NULL,
  `googleId` varchar(22),
  `googleImageUrl` varchar(120),
  `googleEmail` varchar(30),
  `name` varchar(40),
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

