package com.lucas.vosktest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Controller
public class VoiceAiController {

    @Autowired
    VoiceUtil voiceUtil;

    @RequestMapping("/")
    public String index() {
        return "redirect:/home.html";
    }

    @PostMapping("/getWord")
    @ResponseBody
    public ResponseEntity<String> getWord(MultipartFile file) {
        try {
            // 動態生成臨時文件
            Path tempFile = Files.createTempFile("vosk_", ".wav");
            File localFile = tempFile.toFile();

            // 保存上傳的文件到臨時文件
            file.transferTo(localFile);

            // 處理語音文件
            String text = voiceUtil.getWord(localFile.getAbsolutePath());

            // 刪除臨時文件
            localFile.delete();

            return ResponseEntity.ok(text);
        } catch (IOException | UnsupportedAudioFileException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("上傳失敗");
        }
    }

}
