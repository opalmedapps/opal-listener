-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.1.38-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             10.1.0.5464
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- Dumping database structure for questionnairedb2019
DROP DATABASE IF EXISTS `questionnairedb2019`;
CREATE DATABASE IF NOT EXISTS `questionnairedb2019` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `questionnairedb2019`;

-- Dumping structure for function questionnairedb2019.getAnswerTableOptionID
DROP FUNCTION IF EXISTS `getAnswerTableOptionID`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` FUNCTION `getAnswerTableOptionID`(
`i_questionID` BIGINT,
`i_content` VARCHAR(255
),
`i_answerTypeID` BIGINT

) RETURNS bigint(20)
    DETERMINISTIC
BEGIN

-- Declare variables
Declare wsReturn, wsCount int;
Declare wsQuestionID, wsAnswerTypeID bigint;
Declare wsContent varchar(255);

-- Store the parameters
set wsReturn = -1;
Set wsContent = i_content;
Set wsAnswerTypeID = i_answerTypeID;
Set wsQuestionID = i_questionID;

-- Answer Type ID : 1 = Checkbox, 4 = Radiobutton, 5 = Label
-- The answer types can be found in table "Type"
-- NOTE: Currently we don't have any Label for now
if (wsAnswerTypeID = 1) then 
set wsReturn = (SELECT cbOpt.ID 
FROM checkbox cb, checkboxOption cbOpt
WHERE cb.questionId = i_questionID
AND cb.ID = cbOpt.parentTableId
AND cbOpt.description IN (
SELECT contentId
FROM dictionary
WHERE content = i_content
AND deleted <> 1 
AND tableId IN (12, 17, 31) -- where 12, 17, 31 are checkboxOption, labelOption, radioButtonOption tables resp., you can check in definitionTable
)
LIMIT 1
);
end if;
if (wsAnswerTypeID = 4) then 
set wsReturn = (SELECT rbOpt.ID  
FROM radioButton rb, radioButtonOption rbOpt
WHERE rb.questionId = i_questionID
AND rbOpt.parentTableId = rb.ID
AND rbOpt.description IN (
SELECT contentId
FROM dictionary
WHERE content = i_content
AND deleted <> 1 
AND tableId IN (12, 17, 31) -- where 12, 17, 31 are checkboxOption, labelOption, radioButtonOption tables resp., you can check in definitionTable
)
LIMIT 1
);
end if;

set wsReturn = ifnull(wsReturn, -1);
return wsReturn;


END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.getAnswerText
DROP PROCEDURE IF EXISTS `getAnswerText`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `getAnswerText`(
	IN `i_AnswerId` BIGINT,
	IN `i_Language` BIGINT



)
    DETERMINISTIC
BEGIN

	-- Declare variables
	-- Declare wsReturn VarChar(516);
	
	-- Get the answer
	-- set wsReturn = 
	SELECT CONVERT(answerTextBox.VALUE, CHAR(516)) AS value
	FROM answerTextBox
	WHERE answerTextBox.answerId = i_AnswerId
	UNION 
	SELECT CONVERT(answerSlider.VALUE, CHAR(516))
	FROM answerSlider
	WHERE answerSlider.answerId = i_AnswerId
	UNION 
	SELECT CONVERT(answerDate.VALUE, CHAR(516))
	FROM answerDate
	WHERE answerDate.answerId = i_AnswerId
	UNION 
	SELECT CONVERT(answerTime.VALUE, CHAR(516))
	FROM answerTime
	WHERE answerTime.answerId = i_AnswerId
	UNION 
	SELECT CONVERT(getDisplayName(rbOpt.description, i_Language), CHAR(516)) 
	FROM answerRadioButton aRB, radioButtonOption rbOpt
	WHERE aRB.answerId = i_AnswerId
		AND rbOpt.ID = aRB.`value`
	UNION 
	SELECT CONVERT(getDisplayName(cOpt.description, i_Language), CHAR(516)) 
	FROM answerCheckbox aC, checkboxOption cOpt
	WHERE aC.answerId = i_AnswerId
		AND cOpt.ID = aC.`value`
	UNION 
	SELECT CONVERT(getDisplayName(lOpt.description, i_Language), CHAR(516)) 
	FROM answerLabel aL, labelOption lOpt
	WHERE aL.answerId = i_AnswerId
		AND lOpt.ID = aL.`value`
	;
	
	-- Return wsReturn;

END//
DELIMITER ;

-- Dumping structure for function questionnairedb2019.getDisplayName
DROP FUNCTION IF EXISTS `getDisplayName`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` FUNCTION `getDisplayName`(
	`i_ContentID` BIGINT,
	`i_LanguageID` BIGINT


) RETURNS mediumtext CHARSET utf8
    DETERMINISTIC
BEGIN
-- Declare variables
	Declare wsText, wsReturnText, wsReturn MEDIUMTEXT;
	Declare wsCount int;

	-- Store the parameters
	set wsText = '';
	set wsCount = 0;
	
	-- Get the translation
	Select count(*), content 
	into wsCount, wsReturnText
	from dictionary 
	where contentId = i_ContentID and languageId = i_LanguageID;
	
  -- if no record found then return empty
  -- otherwise return the translation text
  	if (wsCount = 0) then
		set wsReturn = wsText;
	else
		set wsReturn = wsReturnText;
	end if;
	
	Return wsReturn;

END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.getQuestionnaireInfo
DROP PROCEDURE IF EXISTS `getQuestionnaireInfo`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `getQuestionnaireInfo`(
	IN `i_answerQuestionnaireId` BIGINT,
	IN `i_isoLang` VARCHAR(2)

















)
    DETERMINISTIC
BEGIN
	
	-- this procedure is intended to get the questionnaire, section, and questions from an answreQuestionnaireId.
	-- the language is passed in iso form, i.e. 'EN', 'FR'. If the language is not valid, default to French
	
	-- declare variables
	declare wsCountLang, wsCountQuestionnaire, wsReturn, questionnaire_status int;
	declare questionnaire_id bigint;
	declare language_id bigint;
	declare default_isoLang varchar(2);
	declare answer_id_text text;

	-- set default language to French
	set default_isoLang = 'FR';
	
	-- note: wsReturn convention for this procedure: success = 0, language error = -1, error in answerQuestionnaireId = -2
	
	-- get language
	select count(*), ID into wsCountLang, language_id from language where isoLang = i_isoLang and deleted = 0;
	
	-- label is a way to do early exit
	get_questionnaire:BEGIN
	
		-- verify language is correct	
		if wsCountLang <> 1 then
			
			-- try to get language again using default language
			select count(*), ID into wsCountLang, language_id from language where isoLang = default_isoLang and deleted = 0;
			
			-- verify again that language is correct	
			if wsCountLang <> 1 then
				set wsReturn = -1;
				leave get_questionnaire;
			end if;
			
		end if;
		
		-- get the questionnaireId
		select count(*), aq.questionnaireId, aq.`status` into wsCountQuestionnaire, questionnaire_id, questionnaire_status	-- this will return 1 row only since ID is the primary key of answerQuestionnaire table
		from answerquestionnaire aq
		where aq.ID = i_answerQuestionnaireId
			and aq.deleted = 0
		;
	
		-- verify that the questionnaireId is being returned
		if wsCountQuestionnaire <> 1 then
			set wsReturn = -2;
			leave get_questionnaire;
		end if;
		
		-- get information about that particular questionnaire
		select aq.ID as qp_ser_num,
			aq.`status` as status,
			q.ID as questionnaire_id,
			IF (q.nickname <> -1, getDisplayName(q.nickname,language_id), getDisplayName(q.title,language_id)) as nickname,
			q.logo as logo,
			getDisplayName(q.description,language_id) as description,
			getDisplayName(q.instruction,language_id) as instruction, 
			q.optionalFeedback as allow_questionnaire_feedback
		from answerquestionnaire aq 
			left join questionnaire q on (aq.questionnaireId = q.ID)
		where aq.ID = i_answerQuestionnaireId
			and aq.deleted = 0
			and q.deleted = 0
			and q.final = 1
		;
	
		-- Get the information about sections in that questionnaire
		-- temporary table is created to store section_id(s) for the next step
		drop table if exists section_info;
		create temporary table if not exists section_info as 
		(
			select sec.ID as section_id,
				if(sec.title <> -1, getDisplayName(sec.title, language_id), '') as section_title,
				getDisplayName(sec.instruction, language_id) as section_instruction,
				sec.`order` as section_position
			from section sec 
			where sec.questionnaireId = questionnaire_id
				and sec.deleted = 0
		);
		
		select * from section_info;
		
		-- get questions for those sections
		select
			qSec.ID as questionSection_id,
			qSec.order as question_position,
			qSec.sectionId as section_id,
			qSec.orientation as orientation,
			qSec.optional as optional,
			q.ID as question_id,
			getDisplayName(q.question,language_id) as question_text,
			q.typeId as type_id,
			getTypeName(q.typeId,2) as question_type_category_key,	-- this should always be in english for the front-end
			q.polarity as polarity,
			q.optionalFeedback as allow_question_feedback
		from questionSection qSec
			left join question q on (q.ID = qSec.questionId)
		where qSec.sectionId IN (select section_id from section_info)
			and q.deleted = 0
			and q.final = 1
		;
		
		if questionnaire_status = 0 then 
			-- the line below is not really needed, however, since without it the number of query returned will not be the same for new and other status questionnaire, this is added to prevent error when calling this procedure.
			select questionnaire_status as status;
			
		else
			-- if the questionnaire is not new, then get its answer
			
			-- get answers_id for this questionnaire
			drop table if exists answer_summary;
			create temporary table if not exists answer_summary as (
				SELECT 
					aSec.answerQuestionnaireId as questionnairePatientRelSerNum,
					aSec.sectionId as section_id,
					a.ID as answer_id,
					a.questionId as question_id,
					a.typeId as type_id,
					a.answered as answered,
					a.skipped as skipped,
					a.creationDate as created,
					a.lastUpdated as last_updated,
					a.languageId as answer_language_id,
					qSec.ID AS questionSection_id
				FROM (answerSection aSec
					LEFT JOIN answer a ON (a.answerSectionId = aSec.ID)),
					questionSection qSec
				WHERE aSec.answerQuestionnaireId = i_answerQuestionnaireId
				    AND a.deleted = 0
				    AND qSec.questionId = a.questionId
					 AND qSec.sectionId = a.sectionId
			);
			
			-- get the list of answer_id for which to get their values
			select GROUP_CONCAT(answer_id) into answer_id_text from answer_summary;
			
			-- get answer from the answer_ids
			set @wsSQL = concat(
				"select answer_summary.*,
					a.answer_value,
					a.answer_option_text,
					a.intensity,
					a.posX,
					a.posY,
					a.selected
				from answer_summary left join (
					select rb.answerId as answer_id,
						CONVERT(rb.value, CHAR(516)) as answer_value,
						getDisplayName((select rbOpt.description from radioButtonOption rbOpt where rbOpt.ID = rb.value),", language_id, ") as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerRadioButton rb
					where rb.answerId in (", answer_id_text, ")
					UNION
					select c.answerId as answer_id,
						CONVERT(c.value, CHAR(516)) as answer_value,
						getDisplayName((select cOpt.description from checkboxOption cOpt where cOpt.ID = c.value), ",language_id, ") as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerCheckbox c
					where c.answerId in (", answer_id_text, ")
					UNION
					select t.answerId, 
						CONVERT(t.value, CHAR(516)) as answer_value,
						-1 as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerTextBox t
					where t.answerId in (", answer_id_text, ")
					UNION
					select d.answerId, 
						CONVERT(d.value, CHAR(516)) as answer_value,
						-1 as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerDate d
					where d.answerId in (", answer_id_text, ")
					UNION
					select answerTime.answerId, 
						CONVERT(answerTime.value, CHAR(516)) as answer_value,
						-1 as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerTime 
					where answerTime.answerId in (", answer_id_text, ")
					UNION
					select s.answerId, 
						CONVERT(s.value, CHAR(516)) as answer_value,
						-1 as answer_option_text,
						-1 as intensity,
						-1 as posX,
						-1 as posY,
						-1 as selected
					from answerSlider s
					where s.answerId in (", answer_id_text, ")
					UNION
					select l.answerId, 
						CONVERT(l.value, CHAR(516)) as answer_value,
						getDisplayName((select lOpt.description from labelOption lOpt where lOpt.ID = l.value), ", language_id, ") as answer_option_text,
						l.intensity,
						l.posX,
						l.posY,
						l.selected
					from answerLabel l
					where l.answerId in (", answer_id_text, ")) a 
				on (answer_summary.answer_id = a.answer_id)
				;"
			);
			
			-- execute SQL statement
			prepare stmt from @wsSQL;
	
			Execute stmt;
			deallocate prepare stmt;
			
		end if; -- end of getting answers
		
		set wsReturn = 0;
		
	END; -- end of get_questionnaire block

	select wsReturn as procedure_status, language_id as language_id;

END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.getQuestionnaireList
DROP PROCEDURE IF EXISTS `getQuestionnaireList`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `getQuestionnaireList`(
	IN `i_externalPatientId` VARCHAR(64),
	IN `i_isoLang` VARCHAR(2)

)
    DETERMINISTIC
BEGIN

	-- this procedure gets the list of questionnaire belonging to a single patient.
	-- it requires an external patient ID i.e. from OpalDB, and a language in ISO format, i.e. 'EN', 'FR'. If the language is not valid, default to French.
	
	-- declare variables
	declare wsCountLang, wsReturn int;
	declare language_id bigint;
	declare default_isoLang varchar(2);
	
	-- set default language to French
	set default_isoLang = 'FR';
	
	-- note: wsReturn convention for this procedure: success = 0, language error = -1
	
	-- get language
	select count(*), ID into wsCountLang, language_id from language where isoLang = i_isoLang and deleted = 0;
	
	-- label is a way to do early exit
	get_questionnaire_list:BEGIN
	
		-- verify language is correct	
		if wsCountLang <> 1 then
		
			-- try to get language again using default language
			select count(*), ID into wsCountLang, language_id from language where isoLang = default_isoLang and deleted = 0;
			
			-- verify again that language is correct	
			if wsCountLang <> 1 then
				set wsReturn = -1;
				leave get_questionnaire_list;
			end if;
			
		end if;
		
		-- get the list of questionnaire
		SELECT aq.ID AS qp_ser_num,
			aq.questionnaireId AS questionnaire_id,
			aq.`status` AS status,
			aq.creationDate AS created,
			aq.lastUpdated AS last_updated,
			getDisplayName(IF(q.nickname <> -1, q.nickname, q.title), language_id) AS nickname
		FROM answerQuestionnaire aq LEFT JOIN questionnaire q ON q.ID = aq.questionnaireId
		WHERE aq.deleted <> 1
			AND aq.patientId = 
				(SELECT ID
				FROM patient
				WHERE externalId = i_externalPatientId
				AND deleted <> 1);
		
		set wsReturn = 0;
				
	END; -- end of the get_questionnaire_list block
	
	select wsReturn as procedure_status;
	
END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.getQuestionOptions
DROP PROCEDURE IF EXISTS `getQuestionOptions`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `getQuestionOptions`(
	IN `i_typeId` BIGINT,
	IN `i_questionId` TEXT,
	IN `i_languageId` BIGINT



)
    DETERMINISTIC
BEGIN

	/*
	Parameter: i_typeId: the typeId of the questions passed
				i_questionId: the list of questions' ID to get the options for
				i_languageId: the languageId to get the options displayed in
				
	Produce the list of choices/options
	
	note: wsReturn convention for this procedure: success = 0, no matching type = -1
	*/

	-- declare variables
	declare wsReturn, wsTableNameCount int;
	declare tableName, subTableName varchar(255);
	
	get_options: BEGIN
	
		-- verify length of i_questionId
		if (length(trim(i_questionId)) = 0) then
			set wsReturn = 0;
			leave get_options;
		end if;
	
		-- get table names for that type
		select 
			count(*),
			(select def.name from definitionTable def where def.ID = type.tableId) as tableName,
			if (type.subTableId = -1, '-1', (select def.name from definitionTable def where def.ID = type.subTableId)) as subTableName
			into wsTableNameCount, tableName, subTableName
		from type
		where type.ID = i_typeId;
		
		-- verify that a single table name has been returned
		if wsTableNameCount <> 1 then
			set wsReturn = -1;
			leave get_options;
		end if;
		
		-- slider type: special due to it having more fields to translate
		if tableName = 'slider' then
			set @wsSQL = concat(
				"select s.ID, 
					s.questionId,
					s.minValue as min_value,
					s.maxValue as max_value,
					getDisplayName(s.minCaption, ", i_languageId, ") as min_caption,
					getDisplayName(s.maxCaption, ", i_languageId, ") as max_caption,
					s.increment as increment
				from slider s
				where s.questionId in (", i_questionId, ");"
			);
		
		-- types without a subTable: date, time, slider (which is a special case dealed with earlier)
		elseif subTableName = '-1' then
			set @wsSQL = concat(
				"select *
				from ", tableName, " t
				where t.questionId in (", i_questionId, ");
				"
			);
		
		-- types with a subTable: checkbox, radioButton, label, textBox
		else
			set @wsSQL = concat(
				"select *, 
					subT.ID as option_id,
					getDisplayName(subT.description, ", i_languageId, ") as option_text
				from ", tableName, " t
					left join ", subTableName, " subT on (t.ID = subT.parentTableId)
				where t.questionId in (", i_questionId, ");"
			);
		end if;
		
		-- execute SQL statements
		prepare stmt from @wsSQL;
		
		Execute stmt;
		deallocate prepare stmt;
		
		-- end of execution, return success
		set wsReturn = 0;
		
	END; -- end of get_options block
	
	select wsReturn as procedure_status, i_typeId as type_id, tableName as type_table_name;
	 
END//
DELIMITER ;

-- Dumping structure for function questionnairedb2019.getTypeName
DROP FUNCTION IF EXISTS `getTypeName`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` FUNCTION `getTypeName`(
	`i_typeID` INT,
	`i_LanguageID` INT
) RETURNS mediumtext CHARSET latin1
    DETERMINISTIC
BEGIN

	-- Declare variables
	Declare wsText, wsReturnText, wsReturn MEDIUMTEXT;
	Declare wsCount int;

	-- Store the parameters
	set wsText = '';
	set wsCount = 0;
	
	-- Get the type
	select count(*), getDisplayName(type.description, i_LanguageID)
	into wsCount, wsReturnText
	from type
	where type.ID = i_typeID;
	
  -- if no record found then return empty
  -- otherwise return the translation text
  	if (wsCount = 0) then
		set wsReturn = wsText;
	else
		set wsReturn = wsReturnText;
	end if;
	
	Return wsReturn;

END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.queryAnswers
DROP PROCEDURE IF EXISTS `queryAnswers`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `queryAnswers`(
	IN `i_answerQuestionnaireId` TEXT,
	IN `i_languageId` BIGINT


)
    DETERMINISTIC
BEGIN

/*
Parameter: i_answerQuestionnaireID: the list of answerQuestionnaireID for which to get answer for
				i_languageId: the language that the answers are going to be displayed in case the answers have languageId = -1 in the database
Produce the list of answers values translated
*/

set @wsSQL = concat("
select aSec.answerQuestionnaireId AS QuestionnaireSerNum, 
	qSec.ID AS QuestionnaireQuestionSerNum, 
	B.value
from answerSection aSec, 
	questionSection qSec, 
	(Select A.questionId, A.sectionId, A.answerSectionId,

	(SELECT CONVERT(answerTextBox.VALUE, CHAR(516)) 
	FROM answerTextBox
	WHERE answerTextBox.answerId = A.ID
	UNION 
	SELECT CONVERT(answerSlider.VALUE, CHAR(516))
	FROM answerSlider
	WHERE answerSlider.answerId = A.ID
	UNION 
	SELECT CONVERT(answerDate.VALUE, CHAR(516))
	FROM answerDate
	WHERE answerDate.answerId = A.ID
	UNION 
	SELECT CONVERT(answerTime.VALUE, CHAR(516))
	FROM answerTime
	WHERE answerTime.answerId = A.ID
	UNION 
	SELECT CONVERT(getDisplayName(rbOpt.description, if(A.languageId < 0,", i_languageId, ", A.languageId)), CHAR(516)) 
	FROM answerRadioButton aRB, radioButtonOption rbOpt
	WHERE aRB.answerId = A.ID
		AND rbOpt.ID = aRB.`value`) AS value
from answer A
where A.deleted <> 1
UNION
Select A.questionId, A.sectionId, A.answerSectionId, CONVERT(getDisplayName(cOpt.description, if(A.languageId < 0,", i_languageId, ", A.languageId) ), CHAR(516)) AS value
from answer A, answerCheckbox aC, checkboxOption cOpt
where A.deleted <> 1
	and aC.answerId = A.ID
		AND cOpt.ID = aC.`value`
UNION
Select A.questionId, A.sectionId, A.answerSectionId,CONVERT(getDisplayName(lOpt.description, if(A.languageId < 0,", i_languageId, ", A.languageId)), CHAR(516)) AS value
from answer A, answerLabel aL, labelOption lOpt
where A.deleted <> 1
	and aL.answerId = A.ID
		AND lOpt.ID = aL.`value`) B
Where
	qSec.questionId = B.questionId
	and qSec.sectionId = B.sectionId
	and B.answerSectionId = aSec.ID
	and aSec.answerQuestionnaireId IN (", i_answerQuestionnaireId, ");");

Prepare stmt from @wsSQL;
Execute stmt;

deallocate prepare stmt;



END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.queryAnswersPatientQuestionnaire
DROP PROCEDURE IF EXISTS `queryAnswersPatientQuestionnaire`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `queryAnswersPatientQuestionnaire`(
	IN `i_answerQuestionnaireID` TEXT
)
    DETERMINISTIC
BEGIN

/*
Parameter: i_answerQuestionnaireID: the list of answerQuestionnaireID for which to get answer for
Produce the list of answers ID in the answers table
note that this query does not take answered and skipped answers into account since these functionnalities do not exist yet in the qplus as of July 2019
*/

if (length(trim(i_answerQuestionnaireID)) = 0) then
	set i_answerQuestionnaireID = '-1';
end if;


set @wsSQL = concat("
SELECT aSec.answerQuestionnaireId AS QuestionnaireSerNum,
	a.ID,
	a.languageId,
    qSec.ID AS QuestionnaireQuestionSerNum
FROM (answerSection aSec
LEFT JOIN answer a ON (a.answerSectionId = aSec.ID)),
questionSection qSec
WHERE aSec.answerQuestionnaireId IN (", i_answerQuestionnaireID, ")
    AND a.deleted <> 1
AND qSec.questionId = a.questionId
AND qSec.sectionId = a.sectionId");

prepare stmt from @wsSQL;

Execute stmt;
deallocate prepare stmt;


END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.queryPatientQuestionnaireInfo
DROP PROCEDURE IF EXISTS `queryPatientQuestionnaireInfo`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `queryPatientQuestionnaireInfo`(
	IN `i_externalId` BIGINT



)
    DETERMINISTIC
BEGIN

/*
Produce the list of Questionnaires
*/

SELECT IF(`status` <> 2, 0, 1) AS CompletedFlag,
    creationDate AS DateAdded,
    IF(`status` <> 2, NULL, lastUpdated) AS CompletionDate,
    ID AS QuestionnaireSerNum,
    questionnaireId AS QuestionnaireDBSerNum
FROM answerQuestionnaire
WHERE deleted <> 1
AND patientId IN (
    SELECT ID
FROM patient
WHERE externalId = i_externalId
AND deleted <> 1
)
;



END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.queryQuestionChoices
DROP PROCEDURE IF EXISTS `queryQuestionChoices`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `queryQuestionChoices`(
	IN `i_questionID` TEXT

)
    DETERMINISTIC
BEGIN

/*
Parameter: i_questionID: the list of questions' ID to get the options for
Produce the list of choices/options
*/

if (length(trim(i_questionID)) = 0) then
	set i_questionID = '-1';
end if;


set @wsSQL = concat("
SELECT rb.questionId AS QuestionSerNum,
	rbOpt.`order` AS OrderNum,
	getDisplayName(rbOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(rbOpt.description, 1) AS ChoiceDescription_FR
FROM radioButton rb, radioButtonOption rbOpt
WHERE rb.Id = rbOpt.parentTableId
	AND rb.questionId IN (", i_questionID, ")
UNION ALL 
SELECT c.questionId,
	cOpt.`order`,
	getDisplayName(cOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(cOpt.description, 1) AS ChoiceDescription_FR
FROM checkbox c, checkboxOption cOpt
WHERE c.ID = cOpt.parentTableId
	AND c.questionId IN (", i_questionID, ")
UNION ALL 
SELECT slider.questionId,
	slider.minValue - 1 AS OrderNum,
	getDisplayName(slider.minCaption, 2) AS ChoiceDescription_EN,
	getDisplayName(slider.minCaption, 1) AS ChoiceDescription_FR
FROM slider
WHERE slider.questionId IN (", i_questionID, ")
UNION ALL 
SELECT slider.questionId,
	slider.`maxValue` AS OrderNum,
	getDisplayName(slider.maxCaption, 2) AS ChoiceDescription_EN,
	getDisplayName(slider.maxCaption, 1) AS ChoiceDescription_FR
FROM slider
WHERE slider.questionId IN (", i_questionID, ")
UNION ALL 
SELECT l.questionId,
	lOpt.`order`,
	getDisplayName(lOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(lOpt.description, 1) AS ChoiceDescription_FR
FROM label l, labelOption lOpt
WHERE l.ID = lOpt.parentTableId
	AND l.questionId IN (", i_questionID, ")
ORDER BY QuestionSerNum, OrderNum DESC;");


prepare stmt from @wsSQL;

Execute stmt;
deallocate prepare stmt;

END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.queryQuestions
DROP PROCEDURE IF EXISTS `queryQuestions`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `queryQuestions`(
	IN `i_questionnaireID` TEXT


)
    DETERMINISTIC
BEGIN

/*
parameter: list of Questionnaires ID
produce the list of questions in that questionnaire
*/

if (length(trim(i_questionnaireID)) = 0) then
	set i_questionnaireID = '-1';
end if;


set @wsSQL = concat("
SELECT questionnaire.ID AS QuestionnaireDBSerNum,
	questionnaire.legacyName AS QuestionnaireName,
	IF (questionnaire.nickname <> -1, getDisplayName(questionnaire.nickname,2), getDisplayName(questionnaire.title,2)) AS QuestionnaireName_EN,
	IF (questionnaire.nickname <> -1, getDisplayName(questionnaire.nickname,1), getDisplayName(questionnaire.title,1)) AS QuestionnaireName_FR,
	getDisplayName(questionnaire.description,2) AS Intro_EN,
	getDisplayName(questionnaire.description,1) AS Intro_FR,
	sec.ID AS sectionId,
	sec.`order` AS secOrder,
	qSec.ID AS QuestionnaireQuestionSerNum,
	qSec.questionId AS QuestionSerNum,
	q.polarity AS isPositiveQuestion,
	getDisplayName(q.question,2) AS QuestionText_EN,
	getDisplayName(q.question,1) AS QuestionText_FR,
	getDisplayName(display, 2) AS Asseses_EN,
	getDisplayName(display, 1) AS Asseses_FR,
	legacyType.legacyName AS QuestionType,
	q.legacyTypeId AS QuestionTypeSerNum,
	qSec.`order` AS qOrder
FROM questionnaire
	LEFT JOIN section sec ON (sec.questionnaireId = questionnaire.ID)
	LEFT JOIN questionSection qSec ON (qSec.sectionId = sec.ID)
	LEFT JOIN question q ON (qSec.questionId = q.ID)
	LEFT JOIN legacyType ON (q.legacyTypeId = legacyType.ID)
WHERE questionnaire.ID IN (", i_questionnaireID,")
	AND questionnaire.deleted <> 1
	AND sec.deleted <> 1
	AND q.deleted <> 1;");

prepare stmt from @wsSQL;

Execute stmt;
deallocate prepare stmt;

END//
DELIMITER ;

-- Dumping structure for procedure questionnairedb2019.saveAnswer
DROP PROCEDURE IF EXISTS `saveAnswer`;
DELIMITER //
CREATE DEFINER=`root`@`localhost` PROCEDURE `saveAnswer`(
	IN `i_answerQuestionnaireId` BIGINT,
	IN `i_sectionId` BIGINT,
	IN `i_questionId` BIGINT,
	IN `i_questionTypeId` BIGINT,
	IN `i_isSkipped` TINYINT,
	IN `i_appVersion` VARCHAR(255),
	IN `i_isoLang` VARCHAR(2)







)
    DETERMINISTIC
BEGIN

	 /*
        author of update should be patientId(in questionnaireDB) + '_APP_' + appVersion

        1. get patientId and questionnaireId from answerQuestionnaire_id
        2. update status from new to in progress using answerQuestionnaire_id
        3. verify if the answerSection exist for that answerQuestionnaire_id
            3.1 if it exist take that ID as answerSectionId
                and verify if the answer exists for that ID
                    3.1.1 if it exists, mark it as deleted, go to 4.
                    3.1.2 if it does not exist, go to 4.
            3.2 if it does not exist, create one, and take the insertId as answerSectionId
        4. use answerSectionId from 3. and section_id, question_id, is_skipped, question_type_id from the param, questionnaireId from 1., and language from the db to insert into the answer table
         */

	/*
	note: wsReturn convention for this procedure: 
		success = 0, 
		language error = -1, 
		error in answerQuestionnaireId = -2 (no such incomplete questionnaire or more than one such questionnaire),
		error updating the status of the answered questionnaire = -3,
		error inserting a new answerSection = -4,
		error marking deletion of answers due to duplicated answerSection = -5,
		error marking deletion of answers due to rewriting the answer = -6,
		error inserting the answer into answer table = -7
		error finding question type = -8
	*/

	-- declare variables
	declare countLang, countExistingAnswer, countAnswerQuestionnaire, countAnswerSection, affected_row_count, wsReturn int;
	declare language_id, questionnaire_id, patient_id, existing_answerSection_id, inserted_answer_id bigint;
	declare default_isoLang varchar(2);
	declare author_of_update, wsReturnMessage varchar(255);
	declare existing_answerSection_id_concated, existing_answer_id_concated text;
	declare is_answered tinyint; 
	declare type_name mediumtext;
	
	-- declare variables for error messages
	declare success, langErr, answerQuestionnaireIdErr, statusUpdateErr, insertAnswerSectionErr, answerSectionDuplicateErr, rewriteAnswerErr, insertAnswerErr, questionTypeErr int;
	declare success_message, langErr_message, answerQuestionnaireIdErr_message, statusUpdateErr_message, insertAnswerSectionErr_message, answerSectionDuplicateErr_message, rewriteAnswerErr_message, insertAnswerErr_message, questionTypeErr_message varchar(255);
	
	-- set error variables and messages
	set success = 0;
	set langErr = -1;
	set answerQuestionnaireIdErr = -2;
	set statusUpdateErr = -3;
	set insertAnswerSectionErr = -4;
	set answerSectionDuplicateErr = -5;
	set rewriteAnswerErr = -6;
	set insertAnswerErr = -7;
	set questionTypeErr = -8;
	
	set success_message = 'SUCCESS';
	set langErr_message = 'ERROR: cannot get a language id';
	set answerQuestionnaireIdErr_message = 'ERROR: no such incomplete questionnaire or more than one such questionnaire';
	set statusUpdateErr_message = 'ERROR: cannot update status of this questionnaire from new to in progress';
	set insertAnswerSectionErr_message = 'ERROR: failed to insert a new answerSection';
	set answerSectionDuplicateErr_message = 'ERROR: there is more than one row for an answerQuestionnaireId and a sectionId in the answerSection table, but could not mark the answers as deleted';
	set rewriteAnswerErr_message = 'ERROR: failed to mark existing answer as deleted';
	set insertAnswerErr_message = 'ERROR: failed to insert into answer table';
	set questionTypeErr_message = 'ERROR: failed to find the question type';
	
	-- set default language to French
	set default_isoLang = 'FR';
	
	-- get language
	select count(*), ID into countLang, language_id from language where isoLang = i_isoLang and deleted = 0;
	
	-- label for early exit in case of error
	save_answer:BEGIN
	
		-- verify language is correct	
		if countLang <> 1 then
			
			-- try to get language again using default language
			select count(*), ID into countLang, language_id from language where isoLang = default_isoLang and deleted = 0;
			
			-- verify again that language is correct	
			if countLang <> 1 then
				set wsReturn = langErr;
				set wsReturnMessage = langErr_message;
				
				leave save_answer;
			end if;
			
		end if;
		
		-- get the question type for listener
		select getTypeName(i_questionTypeId, 2) into type_name;
		
		-- verify that the type name has been returned correctly
		if type_name = '' then
			set wsReturn = questionTypeErr;
			set wsReturnMessage = questionTypeErr_message;
			leave save_answer;
		end if;
		
		-- 1. get patientId and questionnaireId from answerQuestionnaire_id
		SELECT count(*), patientId, questionnaireId into countAnswerQuestionnaire, patient_id, questionnaire_id
		FROM answerQuestionnaire
		WHERE ID = i_answerQuestionnaireId AND deleted = 0 AND `status` <> 2;
		
		-- verify if there is only one patientId and questionnaireId for the given answerQuestionnaireId
		if countAnswerQuestionnaire <> 1 then
			set wsReturn = answerQuestionnaireIdErr;
			set wsReturnMessage = answerQuestionnaireIdErr_message;
			
			leave save_answer;
		end if;
		
		-- set author of update: author of update should be patientId(in questionnaireDB) + '_APP_' + appVersion
		select concat(patient_id, '_APP_', i_appVersion) into author_of_update;
		
		-- 2. update status from new to in progress using answerQuestionnaire_id
		UPDATE `answerquestionnaire` SET `status` = '1', `lastUpdated` = CURRENT_TIMESTAMP, `updatedBy` = author_of_update WHERE `ID` = i_answerQuestionnaireId;
		
		select ROW_COUNT() into affected_row_count;
			
		-- verify that the row has been updated correctly
		if affected_row_count <> 1 then 
			set wsReturn = statusUpdateErr;
			set wsReturnMessage = statusUpdateErr_message;
			
			leave save_answer;
		else
			-- reset the variable for future use
			set affected_row_count = -1;
		end if;
		
		-- 3. verify if the answerSection exist for that answerQuestionnaire_id 
		-- note that the answerSectionId are concatonated due to maybe there is an error in inserts and there are more than one ID matching the conditions
		-- the left join on answer is to make sure that the answers are deleted
		select count(*), group_concat(answerSection.ID), max(answerSection.ID) into countAnswerSection, existing_answerSection_id_concated, existing_answerSection_id
		from answerSection 
			left join answer a on (answerSection.ID = a.answerSectionId)
		where answerSection.answerQuestionnaireId = i_answerQuestionnaireId 
			and answerSection.sectionId = i_sectionId
			and a.deleted = 0;

		/*
		3.1 if it exist take that ID as answerSectionId and verify if the answer exists for that ID
         3.1.1 if it exists, mark it as deleted, go to 4. 
         3.1.2 if the answer does not exist, go to 4.
      */
      -- this is for error handling, when there is more than one row for an answerQuestionnaireId and a sectionId in the answerSection table, but the answers are not deleted
      if countAnswerSection > 1 then      	
      
      	-- in the next query, the rows to be updated are not specified with answer.ID from the previous query due to that the previous query may contain answer.IDs from the correct answerSection.ID
      	set @wsSQL = concat(
	      	"update answer
	      	set deleted = 1,
	      		deletedBy = '", author_of_update, "',
	      		updatedBy = '", author_of_update, "'
	      	where deleted = 0
					and answerSectionId IN (", existing_answerSection_id_concated, ")
	      		and answerSectionId <> ", existing_answerSection_id, ";"
	      );
	      
	      -- execute SQL statement
			prepare stmt from @wsSQL;
	
			Execute stmt;
			select ROW_COUNT() into affected_row_count;	-- this needs to follow execute to have the correct row count.
			
			deallocate prepare stmt;
						
			-- verify that the rows have been updated correctly
			if affected_row_count = 0 then 
				set wsReturn = answerSectionDuplicateErr;
				set wsReturnMessage = answerSectionDuplicateErr_message;
				
				leave save_answer;
			else
				-- reset the variable for future use
				set affected_row_count = -1;
			end if;
			
	   end if;
      
      -- 3.1.1 if answerSection exists, and contain answer for that question, mark it as deleted, go to 4. 
      if countAnswerSection > 0 then
      	
      	-- verify if the answer exists for that ID
      	select count(*), group_concat(ID) into countExistingAnswer, existing_answer_id_concated
			from answer
			where answerSectionId = existing_answerSection_id
				and deleted = 0
				and questionnaireId = questionnaire_id
				and sectionId = i_sectionId
				and questionId = i_questionId
				and patientId = patient_id
			;
		
			-- mark it as deleted, go to 4. 
			if countExistingAnswer > 0 then
				set @wsSQL = concat(
					"update answer
					set deleted = 1,
						deletedBy = '", author_of_update, "',
						updatedBy = '", author_of_update, "'
					where ID in (", existing_answer_id_concated, ");"
				);
			end if;
			
			-- execute SQL statement
			prepare stmt from @wsSQL;
	
			Execute stmt;
			select ROW_COUNT() into affected_row_count;	-- this must follow execute to have the correct behaviour
			
			deallocate prepare stmt;
			
			-- verify that the rows have been updated correctly
			if affected_row_count = 0 then 
				set wsReturn = rewriteAnswerErr;
				set wsReturnMessage = rewriteAnswerErr_message;
				
				leave save_answer;
			else
				-- reset the variable for future use
				set affected_row_count = -1;
			end if;
			
		else
					
			-- there is no answerSection which has answers non deleted
			-- this is for the case where there are multiple (or one) answerSection(s) but no answer in them yet. For this case, we take that last answerSection as existing_answerSection_id
			-- since there are no answers in them, we do not need to mark the answers as deleted
			select count(*), max(answerSection.ID) into countAnswerSection, existing_answerSection_id
			from answerSection 
			where answerSection.answerQuestionnaireId = i_answerQuestionnaireId 
				and answerSection.sectionId = i_sectionId;
			
			-- if there are no such answerSection
			if countAnswerSection = 0 then
		
				-- 3.2 if answerSection does not exist, create one, and take the insertId as answerSectionId
				INSERT INTO answersection (`answerQuestionnaireId`, `sectionId`) VALUES (i_answerQuestionnaireId, i_sectionId);
				set existing_answerSection_id = LAST_INSERT_ID();
				
				select ROW_COUNT() into affected_row_count;
				
				-- verify that the row has been inserted correctly
				if affected_row_count <> 1 then 
					set wsReturn = insertAnswerSectionErr;
					set wsReturnMessage = insertAnswerSectionErr_message;
					leave save_answer;
				else
					-- reset the variable for future use
					set affected_row_count = -1;
				end if;
				
			end if;
			
		end if;
		
		-- 4. use answerSectionId from 3. and section_id, question_id, is_skipped, question_type_id from the param, questionnaireId from 1., and language from the db to insert into the answer table
		set is_answered = 1 - i_isSkipped;
		
		INSERT INTO `answer` (`questionnaireId`, `sectionId`, `questionId`, `typeId`, `answerSectionId`, `languageId`, `patientId`, `answered`, `skipped`, `deleted`, `deletedBy`, `creationDate`, `createdBy`, `updatedBy`) 
		VALUES (questionnaire_id, i_sectionId, i_questionId, i_questionTypeId, existing_answerSection_id, language_id, patient_id, is_answered, i_isSkipped, 0, '', CURRENT_TIMESTAMP, author_of_update, author_of_update);
		
		set inserted_answer_id = LAST_INSERT_ID();
		
		select ROW_COUNT() into affected_row_count;
			
		-- verify that the row has been inserted correctly
		if affected_row_count <> 1 then 
			set wsReturn = insertAnswerErr;
			set wsReturnMessage = insertAnswerErr_message;
			leave save_answer;
		else
			-- reset the variable for future use
			set affected_row_count = -1;
		end if;
		
		-- set return as success
		set wsReturn = success;
		set wsReturnMessage = success_message;
		
	END; -- end of save_answer label
	
	select wsReturn as procedure_status,
		wsReturnMessage as procedure_message,
		inserted_answer_id as inserted_answer_id,
		type_name as question_type_name_EN
	;	

END//
DELIMITER ;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
